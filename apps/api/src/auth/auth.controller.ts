import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyForgotPasswordCodeDto } from './dto/verify-forgot-password-code.dto';
import { VerifyLoginCodeDto } from './dto/verify-login-code.dto';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 5/min/IP — creates a DB row and sends an email per call, and is the
  // first line of defense against scripted account creation.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Step 1 of credentials login: verifies the password and emails a code.
  // Returns { requiresVerification: true } — NOT tokens. See login/verify.
  // 5/min/IP — the main brake on password-guessing, on top of bcrypt's
  // inherent per-attempt cost.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Step 2: re-checks the password and the emailed code together; only
  // this route actually returns tokens. 10/min/IP — looser than login()
  // since this also has its own 5-wrong-attempts-per-code lockout
  // (AuthService.verifyLoginCode), independent of IP.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login/verify')
  verifyLoginCode(@Body() dto: VerifyLoginCodeDto) {
    return this.authService.verifyLoginCode(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // Step 1 of the forgot-password flow: emails a code if the address has a
  // password to reset. Always returns the same generic response — see
  // AuthService.forgotPassword for why. 5/min/IP — sends an email per call,
  // and this is the endpoint someone could otherwise use to spam a
  // stranger's inbox.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Step 2: checks the emailed code and, if correct, returns a short-lived
  // resetToken (NOT tokens for signing in) that authorizes step 3 alone.
  // 10/min/IP — has its own 5-wrong-attempts lockout too.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password/verify')
  verifyForgotPasswordCode(@Body() dto: VerifyForgotPasswordCodeDto) {
    return this.authService.verifyForgotPasswordCode(dto);
  }

  // Step 3: the resetToken from step 2 is what's checked here — no
  // Bearer/session auth needed, since the whole point is the user is
  // currently locked out. 10/min/IP.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
  }

  // Called only by the Next.js server (lib/auth.ts's jwt callback) after it
  // has already verified the user's identity with Google — never called
  // directly by a browser, hence the internal-key guard instead of a JWT one.
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @Post('oauth/google')
  oauthGoogle(@Body() dto: OAuthExchangeDto) {
    return this.authService.loginWithOAuth(dto);
  }

  // Proves the guard/strategy actually work: no valid Bearer token -> 401.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  // Revokes the access token used to call this route *and* the refresh
  // token in the body, via the Redis blocklist — actual server-side
  // invalidation, not just "the frontend forgot its cookie."
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@CurrentUser() user: RequestUser, @Body() dto: RefreshDto) {
    await this.authService.logout(
      { jti: user.jti, exp: user.exp },
      dto.refreshToken,
    );
  }

  // Permanently deletes the account and (via Prisma's onDelete: Cascade)
  // everything tied to it — resumes, interview sessions, prep progress.
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  async deleteAccount(@CurrentUser() user: RequestUser) {
    await this.authService.deleteAccount(user.id, {
      jti: user.jti,
      exp: user.exp,
    });
  }
}
