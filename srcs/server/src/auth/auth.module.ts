import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AccessTokenStrategy } from './strategies/accessToken.strategy';
import { AccessToken2FAStrategy } from './strategies/accessToken2FA.strategy';
import { RefreshToken2FAStrategy } from './strategies/refreshToken2FAStrategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({})
  ],
  exports:[AuthService],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenStrategy, AccessToken2FAStrategy, RefreshToken2FAStrategy]
})
export class AuthModule {}
