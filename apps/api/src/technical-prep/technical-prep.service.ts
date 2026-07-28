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

// How many catalog problems a new session gets assigned — the top N by
// relevance score once weighted against the topic breakdown (see
// selectProblemsForBreakdown), not just insertion order.
const PROBLEMS_PER_SESSION = 8;
// Broader categories the AI may include even though they don't map to any
// catalog problem — still useful in the displayed breakdown.
const NON_CATALOG_TOPICS = ['System Design', 'Behavioral'];

interface TopicBreakdownEntry {
  topic: string;
  weight: number;
  rationale: string;
}

// Turns a topic display string into a dash-form usable for substring
// matching against catalog tags — "Dynamic Programming" ->
// "dynamic-programming", "Arrays & Strings" -> "arrays-strings" (which
// contains both the "arrays" and "strings" tags). Works uniformly whether
// the topic came fresh from the AI (via TOPIC_TAG_DISPLAY_NAMES), from a
// company's cached breakdown, or from DEFAULT_TOPIC_BREAKDOWN.
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

  // Matches the frontend's `TechnicalPrepSession` type (types/technical-prep.ts).
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
    // findFirst with { id, userId } (not findUnique on id alone) so a user
    // can't fetch someone else's session by guessing its id.
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
    // The nested `session: { userId }` filter enforces ownership — sessionId
    // + problemId alone would let a user update progress that belongs to
    // someone else's session, if they guessed both ids.
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

  // Companies are created ad hoc from whatever the user types — there's no
  // curated catalog to match against yet, so every new name becomes a
  // user-submitted Company row.
  private async findOrCreateCompany(nameRaw: string) {
    const name = nameRaw.trim();
    const slug = slugify(name);

    const existing = await this.prisma.company.findUnique({ where: { slug } });
    if (existing) return existing;

    return this.prisma.company.create({
      data: { name, slug, isUserSubmitted: true },
    });
  }

  // Asks the ai-service to weight topics for this specific company + role
  // combination every time, rather than reusing a company-wide cache —
  // different roles at the same company can emphasize different topics,
  // and Groq is fast/free enough that there's no real cost to asking fresh.
  // Falls back to this company's last-known-good breakdown, and only to
  // the static default if neither is available (no AI ever succeeded for
  // this company). A fresh AI success is cached onto Company as that
  // fallback for next time.
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
      // .trim() guards against stray whitespace the model occasionally
      // echoes back from the comma-separated available-topics list (e.g.
      // " Behavioral") — otherwise it wouldn't match TOPIC_TAG_DISPLAY_NAMES
      // and would render with a visible leading space.
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

  // Scores every catalog problem by summing the weights of whichever
  // breakdown topics it matches (via tag substring match — see
  // normalizeTopic), then takes the top N. A company whose breakdown
  // emphasizes graphs and dynamic programming gets a session weighted
  // toward those, not just "the first 8 problems in the catalog."
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

    // Stable sort: Array.prototype.sort is guaranteed stable in modern JS
    // engines, so problems with equal scores keep their original
    // (creation-order) relative order rather than shuffling arbitrarily.
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, PROBLEMS_PER_SESSION).map((entry) => entry.problem);
  }

  // Lazily seeds the practice problem catalog on first use instead of
  // requiring a separate `prisma db seed` step. `skipDuplicates` makes this
  // safe if two requests race to seed at the same time.
  private async ensureCatalogSeeded() {
    const count = await this.prisma.practiceProblem.count();
    if (count > 0) return;

    await this.prisma.practiceProblem.createMany({
      data: PRACTICE_PROBLEM_CATALOG,
      skipDuplicates: true,
    });
  }
}
