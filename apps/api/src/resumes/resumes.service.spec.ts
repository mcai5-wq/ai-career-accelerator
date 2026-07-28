import { NotFoundException } from '@nestjs/common';
import { ResumesService } from './resumes.service';

describe('ResumesService', () => {
  let service: ResumesService;
  let prisma: any;
  let aiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      resume: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
      jobDescription: { create: jest.fn() },
      resumeAnalysis: { create: jest.fn() },
    };
    aiClient = { analyzeResume: jest.fn() };

    service = new ResumesService(prisma, aiClient);
  });

  describe('analyze', () => {
    it('throws NotFoundException when the resume does not belong to the user', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(
        service.analyze('user-1', 'resume-1', {
          jobTitle: 'Software Engineer',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.jobDescription.create).not.toHaveBeenCalled();
    });

    it('falls back to the job title as the job description text when none is given', async () => {
      prisma.resume.findFirst.mockResolvedValue({
        id: 'resume-1',
        rawText: 'resume text',
      });
      prisma.jobDescription.create.mockResolvedValue({ id: 'jd-1' });
      aiClient.analyzeResume.mockResolvedValue(null);
      prisma.resumeAnalysis.create.mockResolvedValue({
        id: 'analysis-1',
        status: 'FAILED',
      });

      await service.analyze('user-1', 'resume-1', {
        jobTitle: 'Software Engineer',
      });

      expect(prisma.jobDescription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Software Engineer',
          company: undefined,
          rawText: 'Software Engineer',
        },
      });
    });

    it('uses the full job description text when provided', async () => {
      prisma.resume.findFirst.mockResolvedValue({
        id: 'resume-1',
        rawText: 'resume text',
      });
      prisma.jobDescription.create.mockResolvedValue({ id: 'jd-1' });
      aiClient.analyzeResume.mockResolvedValue(null);
      prisma.resumeAnalysis.create.mockResolvedValue({
        id: 'analysis-1',
        status: 'FAILED',
      });

      await service.analyze('user-1', 'resume-1', {
        jobTitle: 'Software Engineer',
        company: 'Acme',
        jobDescriptionText: 'Full posting text here.',
      });

      expect(prisma.jobDescription.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Software Engineer',
          company: 'Acme',
          rawText: 'Full posting text here.',
        },
      });
    });

    it('records a FAILED analysis with no score when the ai-service is unavailable', async () => {
      prisma.resume.findFirst.mockResolvedValue({
        id: 'resume-1',
        rawText: 'resume text',
      });
      prisma.jobDescription.create.mockResolvedValue({ id: 'jd-1' });
      aiClient.analyzeResume.mockResolvedValue(null);
      prisma.resumeAnalysis.create.mockResolvedValue({
        id: 'analysis-1',
        status: 'FAILED',
        errorMessage:
          "AI analysis isn't available right now. Please try again later.",
      });

      const result = await service.analyze('user-1', 'resume-1', {
        jobTitle: 'Software Engineer',
      });

      expect(prisma.resumeAnalysis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resumeId: 'resume-1',
          jobDescriptionId: 'jd-1',
          status: 'FAILED',
          errorMessage: expect.any(String),
        }),
        select: expect.any(Object),
      });
      expect(result.status).toBe('FAILED');
    });

    it('records a COMPLETED analysis with the AI result when available', async () => {
      prisma.resume.findFirst.mockResolvedValue({
        id: 'resume-1',
        rawText: 'resume text',
      });
      prisma.jobDescription.create.mockResolvedValue({ id: 'jd-1' });
      aiClient.analyzeResume.mockResolvedValue({
        atsScore: 72,
        matchedKeywords: ['Node.js'],
        missingKeywords: ['AWS'],
        suggestions: [{ section: 'Skills', suggestion: 'Add AWS experience.' }],
        summary: 'Decent match.',
      });
      prisma.resumeAnalysis.create.mockResolvedValue({
        id: 'analysis-1',
        status: 'COMPLETED',
        atsScore: 72,
      });

      const result = await service.analyze('user-1', 'resume-1', {
        jobTitle: 'Software Engineer',
      });

      expect(prisma.resumeAnalysis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'COMPLETED',
          atsScore: 72,
          matchedKeywords: ['Node.js'],
          missingKeywords: ['AWS'],
          completedAt: expect.any(Date),
        }),
        select: expect.any(Object),
      });
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the resume does not belong to the user', async () => {
      prisma.resume.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'resume-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when nothing was deleted (wrong owner or missing)', async () => {
      prisma.resume.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('user-1', 'resume-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('succeeds silently when a row was deleted', async () => {
      prisma.resume.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.remove('user-1', 'resume-1'),
      ).resolves.toBeUndefined();
    });
  });
});
