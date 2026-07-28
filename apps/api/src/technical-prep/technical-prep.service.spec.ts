import { NotFoundException } from '@nestjs/common';
import { TechnicalPrepService } from './technical-prep.service';

describe('TechnicalPrepService', () => {
  let service: TechnicalPrepService;
  let prisma: any;
  let aiClient: any;

  const fakeProblems = [
    { id: 'p-graphs', topics: ['graphs'] },
    { id: 'p-arrays', topics: ['arrays'] },
    { id: 'p-unrelated', topics: ['sorting'] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      company: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      practiceProblem: {
        count: jest.fn().mockResolvedValue(1), // catalog already seeded
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue(fakeProblems),
      },
      technicalPrepSession: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      technicalPrepProblemProgress: { findFirst: jest.fn(), update: jest.fn() },
    };
    aiClient = { analyzeTechnicalPrepTopics: jest.fn() };

    service = new TechnicalPrepService(prisma, aiClient);
  });

  describe('create', () => {
    it('creates a new company when none exists for this name', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({
        id: 'company-1',
        name: 'Acme',
        topicBreakdown: null,
      });
      aiClient.analyzeTechnicalPrepTopics.mockResolvedValue(null);

      await service.create('user-1', {
        companyNameRaw: 'Acme',
        targetRole: 'Backend Engineer',
      });

      expect(prisma.company.create).toHaveBeenCalledWith({
        data: { name: 'Acme', slug: 'acme', isUserSubmitted: true },
      });
    });

    it('reuses an existing company by slug instead of creating a duplicate', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'Acme',
        topicBreakdown: null,
      });
      aiClient.analyzeTechnicalPrepTopics.mockResolvedValue(null);

      await service.create('user-1', {
        companyNameRaw: 'Acme',
        targetRole: 'Backend Engineer',
      });

      expect(prisma.company.create).not.toHaveBeenCalled();
    });

    it('uses the AI-generated breakdown and caches it on the company when available', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'Netflix',
        topicBreakdown: null,
      });
      aiClient.analyzeTechnicalPrepTopics.mockResolvedValue([
        { topic: 'graphs', weight: 50, rationale: 'Graph-heavy systems.' },
        { topic: 'arrays', weight: 10, rationale: 'Standard fundamentals.' },
      ]);

      await service.create('user-1', {
        companyNameRaw: 'Netflix',
        targetRole: 'Backend Engineer',
      });

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: expect.objectContaining({
          topicBreakdown: [
            { topic: 'Graphs', weight: 50, rationale: 'Graph-heavy systems.' },
            {
              topic: 'Arrays',
              weight: 10,
              rationale: 'Standard fundamentals.',
            },
          ],
        }),
      });

      const sessionData =
        prisma.technicalPrepSession.create.mock.calls[0][0].data;
      expect(sessionData.topicBreakdown).toEqual([
        { topic: 'Graphs', weight: 50, rationale: 'Graph-heavy systems.' },
        { topic: 'Arrays', weight: 10, rationale: 'Standard fundamentals.' },
      ]);
    });

    it('weights problem selection toward higher-weighted matching topics', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'Netflix',
        topicBreakdown: null,
      });
      aiClient.analyzeTechnicalPrepTopics.mockResolvedValue([
        { topic: 'graphs', weight: 50, rationale: 'Graph-heavy systems.' },
        { topic: 'arrays', weight: 10, rationale: 'Standard fundamentals.' },
      ]);

      await service.create('user-1', {
        companyNameRaw: 'Netflix',
        targetRole: 'Backend Engineer',
      });

      const selectedIds =
        prisma.technicalPrepSession.create.mock.calls[0][0].data.problems.create.map(
          (p: any) => p.problemId,
        );
      // p-graphs (score 50) should rank above p-arrays (score 10), which
      // ranks above p-unrelated (score 0, no matching topic).
      expect(selectedIds).toEqual(['p-graphs', 'p-arrays', 'p-unrelated']);
    });

    it("falls back to the company's cached breakdown when AI is unavailable", async () => {
      const cachedBreakdown = [
        { topic: 'Cached Topic', weight: 99, rationale: 'From before.' },
      ];
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'Acme',
        topicBreakdown: cachedBreakdown,
      });
      aiClient.analyzeTechnicalPrepTopics.mockResolvedValue(null);

      await service.create('user-1', {
        companyNameRaw: 'Acme',
        targetRole: 'Backend Engineer',
      });

      expect(prisma.company.update).not.toHaveBeenCalled();
      const sessionData =
        prisma.technicalPrepSession.create.mock.calls[0][0].data;
      expect(sessionData.topicBreakdown).toEqual(cachedBreakdown);
    });

    it('falls back to the static default breakdown when AI is unavailable and nothing is cached', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'Acme',
        topicBreakdown: null,
      });
      aiClient.analyzeTechnicalPrepTopics.mockResolvedValue(null);

      await service.create('user-1', {
        companyNameRaw: 'Acme',
        targetRole: 'Backend Engineer',
      });

      const sessionData =
        prisma.technicalPrepSession.create.mock.calls[0][0].data;
      expect(sessionData.topicBreakdown.length).toBeGreaterThan(0);
      expect(prisma.company.update).not.toHaveBeenCalled();
    });

    it('seeds the practice problem catalog only when empty', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Acme',
        topicBreakdown: null,
      });
      aiClient.analyzeTechnicalPrepTopics.mockResolvedValue(null);
      prisma.practiceProblem.count.mockResolvedValue(0);

      await service.create('user-1', {
        companyNameRaw: 'Acme',
        targetRole: 'Backend Engineer',
      });

      expect(prisma.practiceProblem.createMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the session does not belong to the user', async () => {
      prisma.technicalPrepSession.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'session-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProblemProgress', () => {
    it('throws NotFoundException when the progress row is not found (wrong owner or missing)', async () => {
      prisma.technicalPrepProblemProgress.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProblemProgress('user-1', 'session-1', 'problem-1', {
          status: 'SOLVED',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.technicalPrepProblemProgress.update).not.toHaveBeenCalled();
    });

    it('updates the status when the progress row is found', async () => {
      prisma.technicalPrepProblemProgress.findFirst.mockResolvedValue({
        id: 'progress-1',
      });
      prisma.technicalPrepProblemProgress.update.mockResolvedValue({
        id: 'progress-1',
        status: 'SOLVED',
      });

      const result = await service.updateProblemProgress(
        'user-1',
        'session-1',
        'problem-1',
        {
          status: 'SOLVED',
        },
      );

      expect(prisma.technicalPrepProblemProgress.update).toHaveBeenCalledWith({
        where: { id: 'progress-1' },
        data: { status: 'SOLVED' },
        select: expect.any(Object),
      });
      expect(result.status).toBe('SOLVED');
    });
  });
});
