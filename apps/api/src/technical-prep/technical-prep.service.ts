import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiClientService } from '../ai/ai-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalPrepSessionDto } from './dto/create-technical-prep-session.dto';
import { UpdateProblemProgressDto } from './dto/update-problem-progress.dto';
import {
  CATALOG_TOPIC_TAGS,
  DEFAULT_TOPIC_BREAKDOWN,
  PRACTICE_PROBLEM_CATALOG,
  TOPIC_TAG_DISPLAY_NAMES,
  slugify,
} from './practice-problem-catalog';

const PROBLEMS_PER_SESSION = 8;
// Broader categories that don't map to a catalog problem but are still
// worth showing in the breakdown.
const NON_CATALOG_TOPICS = ['System Design', 'Behavioral'];

interface TopicBreakdownEntry {
  topic: string;
  weight: number;
  rationale: string;
}

// "Dynamic Programming" -> "dynamic-programming", "Arrays & Strings" ->
// "arrays-strings" (contains both "arrays" and "strings" tags). Lets a
// display-style topic name match against the catalog's plain tags.
function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class TechnicalPrepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  private readonly summarySelect = {
    id: true,
    companyNameRaw: true,
    targetRole: true,
    status: true,
    topicBreakdown: true,
    createdAt: true,
  } satisfies Prisma.TechnicalPrepSessionSelect;

  private readonly problemProgressSelect = {
    id: true,
    status: true,
    problem: {
      select: {
        id: true,
        title: true,
        difficulty: true,
        topics: true,
        externalUrl: true,
        source: true,
      },
    },
  } satisfies Prisma.TechnicalPrepProblemProgressSelect;

  private readonly detailSelect = {
    ...this.summarySelect,
    problems: {
      select: this.problemProgressSelect,
    },
  } satisfies Prisma.TechnicalPrepSessionSelect;

  async create(userId: string, dto: CreateTechnicalPrepSessionDto) {
    const company = await this.findOrCreateCompany(dto.companyNameRaw);
    await this.ensureCatalogSeeded();

    const topicBreakdown = await this.generateTopicBreakdown(
      company,
      dto.targetRole,
    );
    const problems = await this.selectProblemsForBreakdown(topicBreakdown);

    return this.prisma.technicalPrepSession.create({
      data: {
        userId,
        companyId: company.id,
        companyNameRaw: dto.companyNameRaw,
        targetRole: dto.targetRole,
        status: 'READY',
        topicBreakdown: topicBreakdown as unknown as Prisma.InputJsonValue,
        problems: {
          create: problems.map((problem) => ({ problemId: problem.id })),
        },
      },
      select: this.summarySelect,
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.technicalPrepSession.findMany({
      where: { userId },
      select: this.summarySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const session = await this.prisma.technicalPrepSession.findFirst({
      where: { id, userId },
      select: this.detailSelect,
    });

    if (!session) {
      throw new NotFoundException('Technical prep session not found.');
    }

    return session;
  }

  async updateProblemProgress(
    userId: string,
    sessionId: string,
    problemId: string,
    dto: UpdateProblemProgressDto,
  ) {
    const progress = await this.prisma.technicalPrepProblemProgress.findFirst({
      where: { sessionId, problemId, session: { userId } },
    });

    if (!progress) {
      throw new NotFoundException(
        'Practice problem not found in this session.',
      );
    }

    return this.prisma.technicalPrepProblemProgress.update({
      where: { id: progress.id },
      data: { status: dto.status },
      select: this.problemProgressSelect,
    });
  }

  private async findOrCreateCompany(nameRaw: string) {
    const name = nameRaw.trim();
    const slug = slugify(name);

    const existing = await this.prisma.company.findUnique({ where: { slug } });
    if (existing) return existing;

    return this.prisma.company.create({
      data: { name, slug, isUserSubmitted: true },
    });
  }

  // Asks for a fresh breakdown every time rather than only reusing a
  // per-company cache, since role changes what should matter even at the
  // same company. Falls back to the last one that worked for this company,
  // then to the static default if nothing's ever worked.
  private async generateTopicBreakdown(
    company: {
      id: string;
      name: string;
      topicBreakdown: Prisma.JsonValue | null;
    },
    targetRole: string,
  ): Promise<TopicBreakdownEntry[]> {
    const generated = await this.aiClient.analyzeTechnicalPrepTopics({
      company: company.name,
      targetRole,
      availableTopics: [...CATALOG_TOPIC_TAGS, ...NON_CATALOG_TOPICS],
    });

    if (generated && generated.length > 0) {
      const breakdown: TopicBreakdownEntry[] = generated.map((entry) => {
        const topic = entry.topic.trim();
        return {
          topic: TOPIC_TAG_DISPLAY_NAMES[topic] ?? topic,
          weight: entry.weight,
          rationale: entry.rationale,
        };
      });

      await this.prisma.company.update({
        where: { id: company.id },
        data: {
          topicBreakdown: breakdown as unknown as Prisma.InputJsonValue,
          topicBreakdownUpdatedAt: new Date(),
        },
      });

      return breakdown;
    }

    if (company.topicBreakdown) {
      return company.topicBreakdown as unknown as TopicBreakdownEntry[];
    }

    return DEFAULT_TOPIC_BREAKDOWN;
  }

  // Scores each catalog problem by the weight of whichever breakdown
  // topics it matches, then takes the top N — so a graph-heavy breakdown
  // actually pulls in graph problems instead of just the first 8 in the catalog.
  private async selectProblemsForBreakdown(
    topicBreakdown: TopicBreakdownEntry[],
  ) {
    const allProblems = await this.prisma.practiceProblem.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const normalizedWeights = topicBreakdown.map((entry) => ({
      normalized: normalizeTopic(entry.topic),
      weight: entry.weight,
    }));

    const scored = allProblems.map((problem) => {
      const score = problem.topics.reduce((sum, tag) => {
        const matched = normalizedWeights.find((entry) =>
          entry.normalized.includes(tag),
        );
        return sum + (matched?.weight ?? 0);
      }, 0);
      return { problem, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, PROBLEMS_PER_SESSION).map((entry) => entry.problem);
  }

  private async ensureCatalogSeeded() {
    const count = await this.prisma.practiceProblem.count();
    if (count > 0) return;

    await this.prisma.practiceProblem.createMany({
      data: PRACTICE_PROBLEM_CATALOG,
      skipDuplicates: true,
    });
  }
}
