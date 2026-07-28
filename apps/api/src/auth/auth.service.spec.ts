import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let redisService: any;
  let mailService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('15m') };
    redisService = {
      setOtp: jest.fn(),
      getOtp: jest.fn(),
      updateOtpAttempts: jest.fn(),
      deleteOtp: jest.fn(),
      revoke: jest.fn(),
      isRevoked: jest.fn(),
    };
    mailService = {
      sendLoginCode: jest.fn(),
      sendPasswordResetCode: jest.fn(),
    };

    service = new AuthService(
      prisma,
      jwtService,
      configService,
      redisService,
      mailService,
    );
  });

  describe('register', () => {
    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'a@b.com',
          password: 'password123',
          name: 'A',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates the user with a hashed password and sends a verification code, without returning tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        name: 'A',
      });

      const result = await service.register({
        email: 'a@b.com',
        password: 'password123',
        name: 'A',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'a@b.com',
          passwordHash: 'hashed-password',
          name: 'A',
          provider: 'CREDENTIALS',
        },
      });
      expect(redisService.setOtp).toHaveBeenCalledWith(
        'a@b.com',
        { code: expect.stringMatching(/^\d{6}$/), attempts: 0 },
        600,
      );
      expect(mailService.sendLoginCode).toHaveBeenCalledWith(
        'a@b.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result).toEqual({ requiresVerification: true, email: 'a@b.com' });
    });
  });

  describe('login', () => {
    it('rejects a nonexistent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@x.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mailService.sendLoginCode).not.toHaveBeenCalled();
    });

    it('rejects a Google-only account with no password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'g@x.com',
        passwordHash: null,
      });

      await expect(
        service.login({ email: 'g@x.com', password: 'whatever' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mailService.sendLoginCode).not.toHaveBeenCalled();
    });

    it('sends a verification code on a correct password, without returning tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'a@b.com',
        password: 'correct',
      });

      expect(mailService.sendLoginCode).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
      );
      expect(result).toEqual({ requiresVerification: true, email: 'a@b.com' });
    });
  });

  describe('verifyLoginCode', () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      passwordHash: 'hashed',
      name: 'A',
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('rejects when no code was ever requested', async () => {
      redisService.getOtp.mockResolvedValue(null);

      await expect(
        service.verifyLoginCode({
          email: user.email,
          password: 'correct',
          code: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects and clears the code after too many wrong attempts', async () => {
      redisService.getOtp.mockResolvedValue({ code: '123456', attempts: 5 });

      await expect(
        service.verifyLoginCode({
          email: user.email,
          password: 'correct',
          code: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisService.deleteOtp).toHaveBeenCalledWith(user.email);
    });

    it('rejects a wrong code and increments the attempt counter', async () => {
      redisService.getOtp.mockResolvedValue({ code: '123456', attempts: 1 });

      await expect(
        service.verifyLoginCode({
          email: user.email,
          password: 'correct',
          code: '000000',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisService.updateOtpAttempts).toHaveBeenCalledWith(user.email, {
        code: '123456',
        attempts: 2,
      });
    });

    it('re-checks the password even when a code is present — a leaked code alone cannot sign in', async () => {
      redisService.getOtp.mockResolvedValue({ code: '123456', attempts: 0 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyLoginCode({
          email: user.email,
          password: 'wrong',
          code: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisService.getOtp).not.toHaveBeenCalled();
    });

    it('returns tokens and clears the code on a correct password + code', async () => {
      redisService.getOtp.mockResolvedValue({ code: '123456', attempts: 0 });
      jwtService.signAsync.mockResolvedValue('signed-jwt');

      const result = await service.verifyLoginCode({
        email: user.email,
        password: 'correct',
        code: '123456',
      });

      expect(redisService.deleteOtp).toHaveBeenCalledWith(user.email);
      expect(result).toEqual({
        user: { id: '1', email: 'a@b.com', name: 'A' },
        accessToken: 'signed-jwt',
        refreshToken: 'signed-jwt',
      });
    });
  });

  describe('forgotPassword', () => {
    it('sends no email for a nonexistent account, but returns the same generic response', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nobody@x.com' });

      expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
      expect(result).toEqual({
        requiresVerification: true,
        email: 'nobody@x.com',
      });
    });

    it('sends no email for a Google-only account (no password), but returns the same generic response', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'g@x.com',
        passwordHash: null,
      });

      const result = await service.forgotPassword({ email: 'g@x.com' });

      expect(mailService.sendPasswordResetCode).not.toHaveBeenCalled();
      expect(result).toEqual({ requiresVerification: true, email: 'g@x.com' });
    });

    it('sends a reset code for an account with a password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@x.com',
        passwordHash: 'hashed',
      });

      const result = await service.forgotPassword({ email: 'a@x.com' });

      expect(redisService.setOtp).toHaveBeenCalledWith(
        'password-reset:a@x.com',
        { code: expect.stringMatching(/^\d{6}$/), attempts: 0 },
        600,
      );
      expect(mailService.sendPasswordResetCode).toHaveBeenCalledWith(
        'a@x.com',
        expect.any(String),
      );
      expect(result).toEqual({ requiresVerification: true, email: 'a@x.com' });
    });
  });

  describe('verifyForgotPasswordCode', () => {
    it('rejects when no code was requested', async () => {
      redisService.getOtp.mockResolvedValue(null);

      await expect(
        service.verifyForgotPasswordCode({ email: 'a@x.com', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a wrong code and increments the attempt counter under the password-reset namespace', async () => {
      redisService.getOtp.mockResolvedValue({ code: '123456', attempts: 0 });

      await expect(
        service.verifyForgotPasswordCode({ email: 'a@x.com', code: '000000' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisService.updateOtpAttempts).toHaveBeenCalledWith(
        'password-reset:a@x.com',
        {
          code: '123456',
          attempts: 1,
        },
      );
    });

    it('rejects if the account was deleted between requesting and verifying the code', async () => {
      redisService.getOtp.mockResolvedValue({ code: '123456', attempts: 0 });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyForgotPasswordCode({ email: 'a@x.com', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues a resetToken on a correct code and clears the OTP', async () => {
      redisService.getOtp.mockResolvedValue({ code: '123456', attempts: 0 });
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@x.com' });
      jwtService.signAsync.mockResolvedValue('reset-jwt');

      const result = await service.verifyForgotPasswordCode({
        email: 'a@x.com',
        code: '123456',
      });

      expect(redisService.deleteOtp).toHaveBeenCalledWith(
        'password-reset:a@x.com',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: '1',
          email: 'a@x.com',
          type: 'password_reset',
        }),
        { expiresIn: '15m' },
      );
      expect(result).toEqual({ resetToken: 'reset-jwt' });
    });
  });

  describe('resetPassword', () => {
    it('rejects an unverifiable token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(
        service.resetPassword({
          resetToken: 'bad',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a token that is not a password_reset token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        email: 'a@x.com',
        type: 'access',
        jti: 'j1',
        exp: 9_999_999_999,
      });

      await expect(
        service.resetPassword({
          resetToken: 'tok',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a token that has already been used', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        email: 'a@x.com',
        type: 'password_reset',
        jti: 'j1',
        exp: 9_999_999_999,
      });
      redisService.isRevoked.mockResolvedValue(true);

      await expect(
        service.resetPassword({
          resetToken: 'tok',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the password and burns the token (single-use) on success', async () => {
      const exp = Math.floor(Date.now() / 1000) + 900;
      jwtService.verifyAsync.mockResolvedValue({
        sub: '1',
        email: 'a@x.com',
        type: 'password_reset',
        jti: 'j1',
        exp,
      });
      redisService.isRevoked.mockResolvedValue(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.resetPassword({
        resetToken: 'tok',
        newPassword: 'newpassword123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { passwordHash: 'new-hashed-password' },
      });
      expect(redisService.revoke).toHaveBeenCalledWith(
        'j1',
        expect.any(Number),
      );
    });
  });
});
