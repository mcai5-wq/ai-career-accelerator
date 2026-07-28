import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalPrepSessionDto } from './dto/create-technical-prep-session.dto';
import { UpdateProblemProgressDto } from './dto/update-problem-progress.dto';
import {
  DEFAULT_TOPIC_BREAKDOWN,
  PRACTICE_PROBLEM_CATALOG,
  slugify,
} from './practice-problem-catalog';

// How many catalog problems a new session gets assigned. Fixed for now
// since there's no AI/weighting to pick a company-specific subset yet.
const PROBLEMS_PER_SESSION = 8;

@Injectable()
export class TechnicalPrepService {
  constructor(private readonly prisma: PrismaService) {}

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
    const company = await this.findOrCreateCompanyWithBreakdown(
      dto.companyNameRaw,
    );
    await this.ensureCatalogSeeded();

    const problems = await this.prisma.practiceProblem.findMany({
      take: PROBLEMS_PER_SESSION,
      orderBy: { createdAt: 'asc' },
    });

    return this.prisma.technicalPrepSession.create({
      data: {
        userId,
        companyId: company.id,
        companyNameRaw: dto.companyNameRaw,
        targetRole: dto.targetRole,
        status: 'READY',
        topicBreakdown: company.topicBreakdown ?? DEFAULT_TOPIC_BREAKDOWN,
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
  // user-submitted Company row. The topic breakdown is generated once
  // (currently: a static default, no AI wired up yet) and cached on the
  // Company so later sessions for the same company reuse it.
  private async findOrCreateCompanyWithBreakdown(nameRaw: string) {
    const name = nameRaw.trim();
    const slug = slugify(name);

    const existing = await this.prisma.company.findUnique({ where: { slug } });
    if (existing) {
      if (existing.topicBreakdown) return existing;
      return this.prisma.company.update({
        where: { id: existing.id },
        data: {
          topicBreakdown: DEFAULT_TOPIC_BREAKDOWN,
          topicBreakdownUpdatedAt: new Date(),
        },
      });
    }

    return this.prisma.company.create({
      data: {
        name,
        slug,
        isUserSubmitted: true,
        topicBreakdown: DEFAULT_TOPIC_BREAKDOWN,
        topicBreakdownUpdatedAt: new Date(),
      },
    });
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
