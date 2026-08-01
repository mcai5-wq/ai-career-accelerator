import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UploadResumeDto } from './dto/upload-resume.dto';
import { ResumesService } from './resumes.service';

const MAX_PDF_BYTES = 5 * 1024 * 1024;

@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateResumeDto) {
    return this.resumesService.create(user.id, dto);
  }

  // No storage/dest option -> multer keeps the file in memory only, never
  // written to disk.
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES } }),
  )
  uploadPdf(
    @CurrentUser() user: RequestUser,
    @Body() dto: UploadResumeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.resumesService.createFromPdf(user.id, dto.title, file);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.resumesService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.resumesService.findOne(user.id, id);
  }

  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/analyze')
  analyze(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AnalyzeResumeDto,
  ) {
    return this.resumesService.analyze(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.resumesService.remove(user.id, id);
  }
}
