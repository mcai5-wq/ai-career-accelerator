import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiClientService } from '../ai/ai-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewSessionDto } from './dto/create-interview-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { getQuestionsForDifficulty } from './question-bank';

const QUESTIONS_PER_SESSION = 5;
// How many of the 5 we try to generate — the rest come from the bank, so a
// session always ends up with exactly 5 either way.
const AI_QUESTION_TARGET = 2;

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  private readonly summarySelect = {
    id: true,
    role: true,
    company: true,
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

  async create(userId: string, dto: CreateInterviewSessionDto) {
    const bankQuestions = getQuestionsForDifficulty(dto.difficulty);

    const generated = await this.aiClient.generateInterviewQuestions({
      role: dto.role,
      company: dto.company,
      difficulty: dto.difficulty,
      count: AI_QUESTION_TARGET,
      exemplars: bankQuestions,
    });

    const aiQuestions = (generated ?? []).slice(0, AI_QUESTION_TARGET);
    const bankNeeded = QUESTIONS_PER_SESSION - aiQuestions.length;
    const chosenBank = bankQuestions.slice(0, bankNeeded);

    const allQuestions = [
      ...chosenBank.map((question) => ({
        ...question,
        source: 'BANK' as const,
      })),
      ...aiQuestions.map((question) => ({
        ...question,
        source: 'AI_GENERATED' as const,
      })),
    ];

    return this.prisma.interviewSession.create({
      data: {
        userId,
        role: dto.role,
        company: dto.company,
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
    // session: { userId } is what checks ownership here, not just the ids.
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

    // If grading isn't available the answer just stays ungraded (score: null).
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

  // overallScore only gets set once every answer is graded — a partial
  // average would be misleading.
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
        ? Math.round(
            scores.reduce((sum, score) => sum + score, 0) / scores.length,
          )
        : null;

    await this.prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date(), overallScore },
    });
  }
}
