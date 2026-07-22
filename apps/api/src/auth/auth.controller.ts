import {
  Body,
  Controller,
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
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Nest defaults POST to 201 Created; login isn't creating a resource, so
  // report 200 like the frontend (lib/auth.ts) already expects.
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
}
