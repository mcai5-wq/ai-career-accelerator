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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UploadResumeDto } from './dto/upload-resume.dto';
import { ResumesService } from './resumes.service';

const MAX_PDF_BYTES = 5 * 1024 * 1024;

// Every route here requires a valid Bearer token — there's no public read
// access to anyone's resumes.
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateResumeDto) {
    return this.resumesService.create(user.id, dto);
  }

  // multipart/form-data: a `title` field plus a `file` field (the PDF).
  // No `storage`/`dest` option -> multer defaults to in-memory, so the file
  // never touches disk; it's only ever read as a Buffer for text extraction.
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.resumesService.remove(user.id, id);
  }
}
