import { ConflictException, NotFoundException } from '@nestjs/common';
import { InterviewsService } from './interviews.service';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let prisma: any;
  let aiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      interviewSession: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      interviewQuestion: { findFirst: jest.fn(), findMany: jest.fn() },
      interviewAnswer: { create: jest.fn(), update: jest.fn() },
    };
    aiClient = {
      generateInterviewQuestions: jest.fn(),
      gradeInterviewAnswer: jest.fn(),
    };

    service = new InterviewsService(prisma, aiClient);
  });

  describe('create', () => {
    it('mixes AI-generated questions with the bank when AI returns the full target count', async () => {
      aiClient.generateInterviewQuestions.mockResolvedValue([
        { category: 'coding', prompt: 'AI question 1' },
        { category: 'system-design', prompt: 'AI question 2' },
      ]);
      prisma.interviewSession.create.mockResolvedValue({ id: 'session-1' });

      await service.create('user-1', {
        role: 'Backend Engineer',
        difficulty: 'MID',
      });

      const createArgs = prisma.interviewSession.create.mock.calls[0][0];
      const questions = createArgs.data.questions.create;

      expect(questions).toHaveLength(5);
      expect(
        questions.filter((q: any) => q.source === 'AI_GENERATED'),
      ).toHaveLength(2);
      expect(questions.filter((q: any) => q.source === 'BANK')).toHaveLength(3);
      expect(questions.map((q: any) => q.orderIndex)).toEqual([0, 1, 2, 3, 4]);
      expect(createArgs.data.userId).toBe('user-1');
      expect(createArgs.data.role).toBe('Backend Engineer');
      expect(createArgs.data.difficulty).toBe('MID');
    });

    it('falls back to an all-bank session when the AI service is unavailable (returns null)', async () => {
      aiClient.generateInterviewQuestions.mockResolvedValue(null);
      prisma.interviewSession.create.mockResolvedValue({ id: 'session-1' });

      await service.create('user-1', {
        role: 'Backend Engineer',
        difficulty: 'MID',
      });

      const questions =
        prisma.interviewSession.create.mock.calls[0][0].data.questions.create;
      expect(questions).toHaveLength(5);
      expect(questions.every((q: any) => q.source === 'BANK')).toBe(true);
    });

    it('tops up with bank questions when AI returns fewer than the target', async () => {
      aiClient.generateInterviewQuestions.mockResolvedValue([
        { category: 'coding', prompt: 'Only one AI question' },
      ]);
      prisma.interviewSession.create.mockResolvedValue({ id: 'session-1' });

      await service.create('user-1', {
        role: 'Backend Engineer',
        difficulty: 'JUNIOR',
      });

      const questions =
        prisma.interviewSession.create.mock.calls[0][0].data.questions.create;
      expect(questions).toHaveLength(5);
      expect(
        questions.filter((q: any) => q.source === 'AI_GENERATED'),
      ).toHaveLength(1);
      expect(questions.filter((q: any) => q.source === 'BANK')).toHaveLength(4);
    });

    it('never exceeds the AI question target even if the ai-service returns more than asked', async () => {
      aiClient.generateInterviewQuestions.mockResolvedValue([
        { category: 'coding', prompt: 'AI 1' },
        { category: 'coding', prompt: 'AI 2' },
        { category: 'coding', prompt: 'AI 3' },
      ]);
      prisma.interviewSession.create.mockResolvedValue({ id: 'session-1' });

      await service.create('user-1', {
        role: 'Backend Engineer',
        difficulty: 'SENIOR',
      });

      const questions =
        prisma.interviewSession.create.mock.calls[0][0].data.questions.create;
      expect(questions).toHaveLength(5);
      expect(
        questions.filter((q: any) => q.source === 'AI_GENERATED'),
      ).toHaveLength(2);
    });
  });

  describe('submitAnswer', () => {
    const question = {
      id: 'q1',
      sessionId: 'session-1',
      prompt: 'What is a hash map?',
      category: 'coding',
      answer: null,
    };

    it('throws NotFoundException when the question does not exist (or belongs to another user)', async () => {
      prisma.interviewQuestion.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAnswer('user-1', 'session-1', 'q1', {
          answerText: 'my answer',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the question is already answered', async () => {
      prisma.interviewQuestion.findFirst.mockResolvedValue({
        ...question,
        answer: { id: 'a1' },
      });

      await expect(
        service.submitAnswer('user-1', 'session-1', 'q1', {
          answerText: 'my answer',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.interviewAnswer.create).not.toHaveBeenCalled();
    });

    it('leaves the answer ungraded when the ai-service is unavailable', async () => {
      prisma.interviewQuestion.findFirst.mockResolvedValue(question);
      prisma.interviewAnswer.create.mockResolvedValue({
        id: 'a1',
        answerText: 'my answer',
        score: null,
        strengths: [],
        improvementAreas: [],
      });
      aiClient.gradeInterviewAnswer.mockResolvedValue(null);
      prisma.interviewQuestion.findMany.mockResolvedValue([
        { answer: { score: null } },
      ]);

      const result = await service.submitAnswer('user-1', 'session-1', 'q1', {
        answerText: 'my answer',
      });

      expect(prisma.interviewAnswer.update).not.toHaveBeenCalled();
      expect(result.score).toBeNull();
    });

    it('grades the answer and updates it when the ai-service is available', async () => {
      prisma.interviewQuestion.findFirst.mockResolvedValue(question);
      prisma.interviewAnswer.create.mockResolvedValue({
        id: 'a1',
        answerText: 'my answer',
        score: null,
        strengths: [],
        improvementAreas: [],
      });
      aiClient.gradeInterviewAnswer.mockResolvedValue({
        score: 85,
        strengths: ['Clear explanation'],
        improvementAreas: ['Could mention collision handling'],
        summary: 'Solid answer overall.',
      });
      prisma.interviewAnswer.update.mockResolvedValue({
        id: 'a1',
        answerText: 'my answer',
        score: 85,
        strengths: ['Clear explanation'],
        improvementAreas: ['Could mention collision handling'],
      });
      prisma.interviewQuestion.findMany.mockResolvedValue([
        { answer: { score: 85 } },
      ]);

      const result = await service.submitAnswer('user-1', 'session-1', 'q1', {
        answerText: 'my answer',
      });

      expect(prisma.interviewAnswer.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({
          score: 85,
          strengths: ['Clear explanation'],
          improvementAreas: ['Could mention collision handling'],
          feedback: { summary: 'Solid answer overall.' },
        }),
        select: expect.any(Object),
      });
      expect(result.score).toBe(85);
    });

    it('does not complete the session while questions remain unanswered', async () => {
      prisma.interviewQuestion.findFirst.mockResolvedValue(question);
      prisma.interviewAnswer.create.mockResolvedValue({
        id: 'a1',
        score: null,
      });
      aiClient.gradeInterviewAnswer.mockResolvedValue(null);
      prisma.interviewQuestion.findMany.mockResolvedValue([
        { answer: { score: null } },
        { answer: null }, // still unanswered
      ]);

      await service.submitAnswer('user-1', 'session-1', 'q1', {
        answerText: 'my answer',
      });

      expect(prisma.interviewSession.update).not.toHaveBeenCalled();
    });

    it('completes the session with an averaged overallScore once every answer is graded', async () => {
      prisma.interviewQuestion.findFirst.mockResolvedValue(question);
      prisma.interviewAnswer.create.mockResolvedValue({
        id: 'a1',
        score: null,
      });
      aiClient.gradeInterviewAnswer.mockResolvedValue({
        score: 90,
        strengths: [],
        improvementAreas: [],
        summary: '',
      });
      prisma.interviewAnswer.update.mockResolvedValue({ id: 'a1', score: 90 });
      prisma.interviewQuestion.findMany.mockResolvedValue([
        { answer: { score: 90 } },
        { answer: { score: 70 } },
      ]);

      await service.submitAnswer('user-1', 'session-1', 'q1', {
        answerText: 'my answer',
      });

      expect(prisma.interviewSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          overallScore: 80,
        },
      });
    });

    it('completes the session but leaves overallScore null when some answers were never graded', async () => {
      prisma.interviewQuestion.findFirst.mockResolvedValue(question);
      prisma.interviewAnswer.create.mockResolvedValue({
        id: 'a1',
        score: null,
      });
      aiClient.gradeInterviewAnswer.mockResolvedValue(null);
      prisma.interviewQuestion.findMany.mockResolvedValue([
        { answer: { score: null } },
        { answer: { score: 70 } }, // one graded, one not — every question answered though
      ]);

      await service.submitAnswer('user-1', 'session-1', 'q1', {
        answerText: 'my answer',
      });

      expect(prisma.interviewSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          overallScore: null,
        },
      });
    });
  });
});
