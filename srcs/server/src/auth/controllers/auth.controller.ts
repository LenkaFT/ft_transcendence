import { Body, Controller, Get, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/users/decorator/user.decorator';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { User } from 'src/users/entities/user.entity';
import { AccessTokenGuard } from '../guards/accessToken.auth.guard';
import { AccessToken2FAGuard } from '../guards/accessToken2FA.auth.guard';
import { FtAuthGuard } from '../guards/ft.auth.guard';
import { RefreshToken2FAGuard } from '../guards/refreshToken2FA.auth.guard';
import { AuthService } from '../services/auth.service';
import { FileTypeValidationPipe } from '../utils/file.validator';
import {ThrottlerGuard} from '@nestjs/throttler'
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

    @Get('redirect')
    redirect(): object {
      return this.authService.buildRedirectUrl()
    }

    @UseGuards(FtAuthGuard)
    @Get('login')
    login(@GetUser() user: User, @Res() res: any) {
      return this.authService.login(user, res)
    }

    @UseGuards(RefreshToken2FAGuard)
    @Get('refresh')
    refresh(@GetUser() user: User, @Res() res: any) {
      return this.authService.refresh(user, res)
    }

    @UseGuards(AccessTokenGuard)
    @Post('logout')
    logout(@GetUser() user: User, @Res() res: any) {
      return this.authService.logout(user, res)
    }

    @UseGuards(AccessTokenGuard)
    @Get('validate')
    validate(@GetUser() user: User, @Res() res: any) {
      return this.authService.validate(user, res)
    }

    @UseInterceptors(FileInterceptor('file'))
    @UseGuards(AccessTokenGuard)
    @Post('register')
    register(
      @UploadedFile(
        new FileTypeValidationPipe()
      ) file: Express.Multer.File,
      @Body() dto: UpdateUserDto,
      @Res() res:Request,
      @GetUser() user : User
      )
    {
      return this.authService.register(file, dto, res, user)
    }

    @UseGuards(AccessTokenGuard)
    @Get('2fa/generate')
    generateTwoFactorAuthenticationQRCode(@GetUser() user:User) {
      return this.authService.generateTwoFactorAuthenticationQRCode(user)
    }

    @UseGuards(AccessTokenGuard)
    @Post('2fa/login')
    twoFactorAuthenticationLogin(@GetUser() user: User, @Res() res:any, @Body() body:any) {
      return this.authService.twoFactorAuthenticationLogin(user, res, body)
    }

    @UseGuards(AccessToken2FAGuard)
    @Post('2fa/logout')
    logout2fa(@GetUser() user: User, @Res() res: any) {
      return this.authService.logout(user, res)
    }

    @UseGuards(AccessTokenGuard)
    @Post('2fa/turn-on')
    turnOnTwoFactorAuthentication(@GetUser() user: User, @Res() res:any, @Body() body:any) {
      return this.authService.turnOnTwoFactorAuthentication(user, res, body)
    }

    @UseGuards(AccessTokenGuard)
    @Post('2fa/turn-off')
    turnOffTwoFactorAuthentication(@GetUser() user: User, @Res() res:any, @Body() body:any) {
      return this.authService.turnOffTwoFactorAuthentication(user, res, body)
    }
}
