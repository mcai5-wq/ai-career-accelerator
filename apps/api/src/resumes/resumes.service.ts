import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { AiClientService } from '../ai/ai-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { CreateResumeDto } from './dto/create-resume.dto';

// Real PDF header bytes — checked since the browser-supplied mimetype is
// just a claim and easy to spoof by renaming a file.
const PDF_MAGIC_BYTES = '%PDF-';

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  // Leaves out rawText/parsedData so listing resumes doesn't ship full
  // resume text just to render a card.
  private readonly summarySelect = {
    id: true,
    title: true,
    createdAt: true,
    analyses: {
      select: { id: true, status: true, atsScore: true },
    },
  } satisfies Prisma.ResumeSelect;

  private readonly analysisSelect = {
    id: true,
    status: true,
    atsScore: true,
    matchedKeywords: true,
    missingKeywords: true,
    suggestions: true,
    errorMessage: true,
    createdAt: true,
    completedAt: true,
    jobDescription: { select: { id: true, title: true, company: true } },
  } satisfies Prisma.ResumeAnalysisSelect;

  create(userId: string, dto: CreateResumeDto) {
    return this.prisma.resume.create({
      data: {
        userId,
        title: dto.title,
        rawText: dto.rawText,
        fileUrl: dto.fileUrl,
      },
      select: this.summarySelect,
    });
  }

  async createFromPdf(
    userId: string,
    title: string,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF file is required.');
    }

    const looksLikePdf =
      file.mimetype === 'application/pdf' &&
      file.buffer.subarray(0, 5).toString('latin1') === PDF_MAGIC_BYTES;

    if (!looksLikePdf) {
      throw new BadRequestException('Only PDF files are supported.');
    }

    const parser = new PDFParse({ data: file.buffer });
    let rawText: string;
    try {
      const result = await parser.getText();
      rawText = result.text.trim();
    } finally {
      await parser.destroy();
    }

    if (!rawText) {
      throw new BadRequestException(
        "Couldn't read any text from that PDF — it may be a scanned image without a text layer.",
      );
    }

    return this.create(userId, { title, rawText });
  }

  findAllForUser(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      select: this.summarySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
      select: {
        ...this.summarySelect,
        rawText: true,
        fileUrl: true,
        parsedData: true,
        // Overrides the lightweight analyses select above with full detail.
        analyses: {
          select: this.analysisSelect,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found.');
    }

    return resume;
  }

  // No fallback score if the model call fails — unlike interview questions
  // there's no static bank to fall back to, so this just records why.
  async analyze(userId: string, resumeId: string, dto: AnalyzeResumeDto) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found.');
    }

    const jobDescription = await this.prisma.jobDescription.create({
      data: {
        userId,
        title: dto.jobTitle,
        company: dto.company,
        rawText: dto.jobDescriptionText?.trim() || dto.jobTitle,
      },
    });

    const result = await this.aiClient.analyzeResume({
      resumeText: resume.rawText,
      jobTitle: dto.jobTitle,
      company: dto.company,
      jobDescriptionText: dto.jobDescriptionText,
    });

    if (!result) {
      return this.prisma.resumeAnalysis.create({
        data: {
          resumeId: resume.id,
          jobDescriptionId: jobDescription.id,
          status: 'FAILED',
          errorMessage:
            "AI analysis isn't available right now. Please try again later.",
        },
        select: this.analysisSelect,
      });
    }

    return this.prisma.resumeAnalysis.create({
      data: {
        resumeId: resume.id,
        jobDescriptionId: jobDescription.id,
        status: 'COMPLETED',
        atsScore: result.atsScore,
        matchedKeywords: result.matchedKeywords,
        missingKeywords: result.missingKeywords,
        suggestions: result.suggestions as unknown as Prisma.InputJsonValue,
        rawModelOutput: result as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
      select: this.analysisSelect,
    });
  }

  async remove(userId: string, id: string) {
    // deleteMany so the ownership check and delete happen in one query.
    const { count } = await this.prisma.resume.deleteMany({
      where: { id, userId },
    });

    if (count === 0) {
      throw new NotFoundException('Resume not found.');
    }
  }
}
