import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';

@Injectable()
export class ResumesService {
  constructor(private readonly prisma: PrismaService) {}

  // Shared shape for list/create responses — matches the frontend's
  // `Resume` type (apps/web/src/types/resume.ts) exactly, and deliberately
  // excludes `rawText`/`parsedData` so the list view doesn't ship a resume's
  // full text over the wire just to render a card.
  private readonly summarySelect = {
    id: true,
    title: true,
    createdAt: true,
    analyses: {
      select: { id: true, status: true, atsScore: true },
    },
  } satisfies Prisma.ResumeSelect;

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

  findAllForUser(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      select: this.summarySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    // findFirst with { id, userId } (not findUnique on id alone) so a user
    // can't fetch someone else's resume by guessing its id.
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
      select: {
        ...this.summarySelect,
        rawText: true,
        fileUrl: true,
        parsedData: true,
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found.');
    }

    return resume;
  }

  async remove(userId: string, id: string) {
    // deleteMany (not delete) so the ownership check and the delete happen
    // in one query instead of a separate "find, then check owner, then
    // delete" sequence.
    const { count } = await this.prisma.resume.deleteMany({
      where: { id, userId },
    });

    if (count === 0) {
      throw new NotFoundException('Resume not found.');
    }
  }
}
