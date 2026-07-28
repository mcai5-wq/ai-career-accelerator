import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard';
import { CreateInterviewSessionDto } from './dto/create-interview-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { InterviewsService } from './interviews.service';

// Every route here requires a valid Bearer token — there's no public read
// access to anyone's interview sessions.
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  // Calls the ai-service (question generation) — throttled per-user
  // (UserThrottlerGuard runs after JwtAuthGuard above, so req.user is
  // already populated) rather than per-IP, since this is authenticated.
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInterviewSessionDto,
  ) {
    return this.interviewsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.interviewsService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.interviewsService.findOne(user.id, id);
  }

  // Calls the ai-service (answer grading) — same per-user throttling as
  // create() above.
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/questions/:questionId/answer')
  submitAnswer(
    @CurrentUser() user: RequestUser,
    @Param('id') sessionId: string,
    @Param('questionId') questionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.interviewsService.submitAnswer(
      user.id,
      sessionId,
      questionId,
      dto,
    );
  }
}
