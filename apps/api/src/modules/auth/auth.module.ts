import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MfaModule } from '../mfa/mfa.module';
import { EMAIL_SERVICE } from '../../common/external-services';
import { createSmtpEmailServiceFromEnv } from '../../common/external-services/implementations/smtp-email.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.secret');
        if (!secret) {
          throw new Error('JWT secret is not configured. Set jwt.secret in your environment variables.');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('jwt.expiry'),
          },
        };
      },
      inject: [ConfigService],
    }),
    MfaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: EMAIL_SERVICE,
      useFactory: () => createSmtpEmailServiceFromEnv(),
    },
  ],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
