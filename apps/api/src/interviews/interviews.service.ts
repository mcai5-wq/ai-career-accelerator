import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiClientService } from '../ai/ai-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewSessionDto } from './dto/create-interview-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { getQuestionsForDifficulty } from './question-bank';

const QUESTIONS_PER_SESSION = 5;
// How many of the 5 we *attempt* to source from AI — the rest are filled in
// from the bank, so a session always has exactly 5 questions whether or not
// AI generation is available. Kept low relative to the bank so a single bad
// generation can't dominate a session's quality.
const AI_QUESTION_TARGET = 2;

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  // Matches the frontend's `InterviewSession` type (types/interview.ts) —
  // list/summary views don't need the questions.
  private readonly summarySelect = {
    id: true,
    role: true,
    difficulty: true,
    status: true,
    overallScore: true,
    createdAt: true,
    completedAt: true,
  } satisfies Prisma.InterviewSessionSelect;

  private readonly answerSelect = {
    id: true,
    answerText: true,
    score: true,
    strengths: true,
    improvementAreas: true,
  } satisfies Prisma.InterviewAnswerSelect;

  private readonly detailSelect = {
    ...this.summarySelect,
    questions: {
      select: {
        id: true,
        orderIndex: true,
        prompt: true,
        category: true,
        answer: { select: this.answerSelect },
      },
      orderBy: { orderIndex: 'asc' },
    },
  } satisfies Prisma.InterviewSessionSelect;

  // Every session gets QUESTIONS_PER_SESSION questions: as many as possible
  // from AI generation (using the bank as few-shot style exemplars so
  // generated ones read like the hand-curated ones), topped up with bank
  // questions for whatever AI didn't produce. With no ai-service configured
  // this degrades to "all bank" — today's behavior, unchanged.
  async create(userId: string, dto: CreateInterviewSessionDto) {
    const bankQuestions = getQuestionsForDifficulty(dto.difficulty);

    const generated = await this.aiClient.generateInterviewQuestions({
      role: dto.role,
      difficulty: dto.difficulty,
      count: AI_QUESTION_TARGET,
      exemplars: bankQuestions,
    });

    const aiQuestions = (generated ?? []).slice(0, AI_QUESTION_TARGET);
    const bankNeeded = QUESTIONS_PER_SESSION - aiQuestions.length;
    const chosenBank = bankQuestions.slice(0, bankNeeded);

    const allQuestions = [
      ...chosenBank.map((question) => ({ ...question, source: 'BANK' as const })),
      ...aiQuestions.map((question) => ({ ...question, source: 'AI_GENERATED' as const })),
    ];

    return this.prisma.interviewSession.create({
      data: {
        userId,
        role: dto.role,
        difficulty: dto.difficulty,
        questions: {
          create: allQuestions.map((question, index) => ({
            orderIndex: index,
            prompt: question.prompt,
            category: question.category,
            source: question.source,
          })),
        },
      },
      select: this.summarySelect,
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.interviewSession.findMany({
      where: { userId },
      select: this.summarySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    // findFirst with { id, userId } (not findUnique on id alone) so a user
    // can't fetch someone else's session by guessing its id.
    const session = await this.prisma.interviewSession.findFirst({
      where: { id, userId },
      select: this.detailSelect,
    });

    if (!session) {
      throw new NotFoundException('Interview session not found.');
    }

    return session;
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    questionId: string,
    dto: SubmitAnswerDto,
  ) {
    // The nested `session: { userId }` filter is what actually enforces
    // ownership here — sessionId + questionId alone would let a user answer
    // a question that belongs to someone else's session of the same id
    // pattern, if they somehow guessed both ids.
    const question = await this.prisma.interviewQuestion.findFirst({
      where: { id: questionId, sessionId, session: { userId } },
      include: { answer: true },
    });

    if (!question) {
      throw new NotFoundException('Interview question not found.');
    }

    if (question.answer) {
      throw new ConflictException('This question has already been answered.');
    }

    const answer = await this.prisma.interviewAnswer.create({
      data: { questionId, answerText: dto.answerText },
      select: this.answerSelect,
    });

    // Best-effort: if AI grading isn't available, the answer is left as-is
    // (score: null) and the frontend shows "Feedback pending…" — same
    // behavior as before AI grading existed at all.
    const grading = await this.aiClient.gradeInterviewAnswer({
      prompt: question.prompt,
      category: question.category,
      answerText: dto.answerText,
    });

    let result = answer;
    if (grading) {
      result = await this.prisma.interviewAnswer.update({
        where: { id: answer.id },
        data: {
          score: grading.score,
          strengths: grading.strengths,
          improvementAreas: grading.improvementAreas,
          feedback: { summary: grading.summary },
          rawModelOutput: grading as unknown as Prisma.InputJsonValue,
        },
        select: this.answerSelect,
      });
    }

    await this.completeSessionIfFullyAnswered(sessionId);

    return result;
  }

  // Flips status once every question has a submitted answer, the same way
  // a human would consider the session "done". `overallScore` only gets set
  // once every answer has actually been graded — a partial average would
  // misleadingly imply the whole session was scored.
  private async completeSessionIfFullyAnswered(sessionId: string) {
    const questions = await this.prisma.interviewQuestion.findMany({
      where: { sessionId },
      select: { answer: { select: { score: true } } },
    });

    const allAnswered = questions.every((question) => question.answer !== null);
    if (!allAnswered) return;

    const scores = questions
      .map((question) => question.answer?.score)
      .filter((score): score is number => typeof score === 'number');

    const overallScore =
      scores.length === questions.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null;

    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date(), overallScore },
    });
  }
}
