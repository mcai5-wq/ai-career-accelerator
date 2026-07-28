import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTechnicalPrepSessionDto } from './dto/create-technical-prep-session.dto';
import { UpdateProblemProgressDto } from './dto/update-problem-progress.dto';
import { TechnicalPrepService } from './technical-prep.service';

// Every route here requires a valid Bearer token — there's no public read
// access to anyone's technical prep sessions.
@UseGuards(JwtAuthGuard)
@Controller('technical-prep')
export class TechnicalPrepController {
  constructor(private readonly technicalPrepService: TechnicalPrepService) {}

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTechnicalPrepSessionDto,
  ) {
    return this.technicalPrepService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.technicalPrepService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.technicalPrepService.findOne(user.id, id);
  }

  @Patch(':id/problems/:problemId')
  updateProblemProgress(
    @CurrentUser() user: RequestUser,
    @Param('id') sessionId: string,
    @Param('problemId') problemId: string,
    @Body() dto: UpdateProblemProgressDto,
  ) {
    return this.technicalPrepService.updateProblemProgress(
      user.id,
      sessionId,
      problemId,
      dto,
    );
  }
}
