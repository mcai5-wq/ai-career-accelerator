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
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyLoginCodeDto } from './dto/verify-login-code.dto';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Step 1 of credentials login: verifies the password and emails a code.
  // Returns { requiresVerification: true } — NOT tokens. See login/verify.
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Step 2: re-checks the password and the emailed code together; only
  // this route actually returns tokens.
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
