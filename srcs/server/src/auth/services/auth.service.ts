import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, Res, UnauthorizedException } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/services/users.service';

import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import axios from 'axios';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';


@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,

  ) { }


  /**
   * @description Build the url that redirects to the 42 auth app
   */
  buildRedirectUrl(): object {
    let url = new URL('/oauth/authorize', process.env.OAUTH_URL)
    url.searchParams.set('client_id', process.env.CLIENT_ID)
    url.searchParams.set('redirect_uri', process.env.CALLBACK_URL)
    url.searchParams.set('response_type', 'code')
    return ({ url: url.toString() })
  }


  /**
   * @description Send a post request to the 42 api with the `callback code` and fetch the 42 auth `token` 
   */
  async getFtToken(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const bodyParameters = {
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID,
        code: code,
        client_secret: process.env.SECRET,
        redirect_uri: process.env.CALLBACK_URL
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }

      axios.post(
        "https://api.intra.42.fr/oauth/token",
        bodyParameters,
        config
      ).then((res) => {
        resolve(res.data.access_token as string)
      }, (err) => {
        resolve(null)
      })
    })
  }


  /**
   * @description  Send a get request to the 42 api with the `42 token` and fetch the token owner `ftId`
   */
  async getFtId(token: string): Promise<number> {
    return new Promise((resolve, reject) => {

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }

      axios.get(
        "https://api.intra.42.fr/v2/me",
        config
      ).then((res) => {
        resolve(res.data.id as number)
      }, (err) => {
        resolve(null)
      })
    })
  }


  /**
   * @description Check the validity of a user from his given `ftId`, and then return him if it exists, or creates a new one
   */
  async validateUser(ftId: number) {

    const user = await this.usersService.findOneByFtId(ftId)
    if (user) {
      Logger.log(`User #${user.id} logged`)
      return user
    }
    const newUser = await this.usersService.create({ ftId: ftId })
    if (!newUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot create user' })

    Logger.log(`User ${newUser.id} created`)

    return newUser
  }


  async createAccessToken(payload: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '1d'//REPLACE
    })
  }


  async createRefreshToken(payload: { id: string }): Promise<string> {
    return await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '1h'
    })
  }


  async updateRefreshToken(id: string, refreshToken: string) {
    return await this.usersService.update(id, {
      refreshToken: await this.hash(refreshToken)
    })
  }


  async hash(data: string): Promise<string> {
    return argon2.hash(data)
  }


  /**
   * @description Check the validity of a given `jwt`, and returns its `payload`
   */
  async validateAccessJwt(token: string): Promise<any> {
    const payload = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET })
    if (!payload)
      throw new InternalServerErrorException('JWT error', { cause: new Error(), description: 'Cannot verify JWT' })
    return payload
  }


  /**
   * @description Login user by creating a jwt and store it in user's cookies
   */
  async login(user: User, res: any) {
    const refreshToken = await this.createRefreshToken({ id: user.id })
    const accessToken = await this.createAccessToken({ id: user.id })
    
    if (!refreshToken || !accessToken)
    throw new InternalServerErrorException('JWT error', { cause: new Error(), description: 'Cannot create JWT' })
    
    let fetchUser = await this.updateRefreshToken(user.id, refreshToken)
    if (!fetchUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot updatefetchUuser' })

    if (fetchUser.isTwoFactorAuthenticationEnabled)
      fetchUser = await this.usersService.update(fetchUser.id, { isLogged: true})
    else
      fetchUser = await this.usersService.update(fetchUser.id, { isLogged: true, isAvailable : true})

    if (!fetchUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      domain: process.env.SERVER_IP,
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24, path: '/'
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: false,
      secure: false,
      domain: process.env.SERVER_IP,
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24, path: '/'
    })

    return res.redirect(process.env.CLIENT_URL)
  }


  async refresh(user: User, res: any) {
    const fetchUser = await this.usersService.findOneById(user?.id)

    if (!fetchUser)
      throw new UnauthorizedException('Access denied', { cause: new Error(), description: `Cannot find user` })

    const refreshToken = await this.createRefreshToken({ id: user.id })
    const accessToken = await this.createAccessToken({ id: user.id })
    if (!refreshToken || !accessToken)
      throw new InternalServerErrorException('JWT error', { cause: new Error(), description: 'Cannot create JWT' })

    const updatedUser = await this.updateRefreshToken(user.id, refreshToken)
    if (!updatedUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })

    Logger.log(`Tokens refreshed for user #${user.id}`)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      domain: process.env.SERVER_IP,
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24, path: '/'
    })

    res.cookie('accessToken', accessToken, {
      httpOnly: false,
      secure: false,
      domain: process.env.SERVER_IP,
      sameSite: "Strict",
      maxAge: 1000 * 60 * 60 * 24, path: '/'
    })


    res.send()
  }


  /** 
   * @description Logout user by clearing its jwt in cookies
   */
  async logout(user: User, @Res() res: any) {
    const fetchUser = await this.usersService.findOneById(user?.id)

    if (!fetchUser)
      throw new ForbiddenException('Access denied', { cause: new Error(), description: `Cannot find user` })

    const updatedUser = await this.usersService.update(user.id, { isTwoFactorAuthenticated: false, isLogged: false, isAvailable : false})
    if (!updatedUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })

    Logger.log(`User #${user.id} logged out`)
    return res.clearCookie("refreshToken").clearCookie('accessToken').status(200).send()

  }

  async validate(user: User, @Res() res: any) {
    const fetchUser = await this.usersService.findOneById(user?.id)
    if (!fetchUser)
      throw new UnauthorizedException('Access denied', { cause: new Error(), description: `Cannot find user` })
    

    return res.status(200).send(this.usersService.removeProtectedProperties(user))
  }


  async register(file: Express.Multer.File, dto: UpdateUserDto, res: any, user: User) {

    if (file) {
      const avatar = await this.usersService.addAvatar(user.id, file.buffer, file.originalname)
      if (!avatar)
        throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot create avatar' })
    }

    if (dto.username?.length > 0 && await this.usersService.findOneByUsername(dto.username))
      throw new ConflictException('username already exists', { cause: new Error(), description: 'Database error' })

    const newUser = await this.usersService.update(user.id, { username: dto.username, isRegistered: true })
    if (!newUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })

    return res.status(200).send(dto)
  }

  async generateTwoFactorAuthenticationSecret(user: User) {
    if (user.twoFactorAuthenticationSecret)
      throw new BadRequestException('User error', { cause: new Error(), description: '2fa is already activated' })

    const secret = authenticator.generateSecret()
    const newUser = await this.usersService.update(user.id, { twoFactorAuthenticationSecret: secret })
    if (!newUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })

    return secret
  }

  async generateTwoFactorAuthenticationQRCode(user: User) {

    let secret: string 
    
    if (!user.twoFactorAuthenticationSecret) {
      secret = await this.generateTwoFactorAuthenticationSecret(user)
      if (!secret)
        throw new InternalServerErrorException('2fa error', { cause: new Error(), description: 'Cannot generate 2fa secret' })
    } else {
      secret = user.twoFactorAuthenticationSecret
    }

   const otpAuthUrl = authenticator.keyuri(user.id, process.env.APP_NAME, secret)

    let qrCodeDataURL = await this.generateQrCodeDataURL(otpAuthUrl)
    if (!qrCodeDataURL)
      throw new InternalServerErrorException('2fa error', { cause: new Error(), description: 'Cannot generate 2fa qrcode' })

    return qrCodeDataURL
  }

  async twoFactorAuthenticationLogin(user: User, res: any, body: any) {
    if (!user.isTwoFactorAuthenticationEnabled)
      throw new BadRequestException('User error', { cause: new Error(), description: 'user is not 2fa enabled' })
    
    if (!body.twoFactorAuthenticationCode)
      throw new BadRequestException('Wrong authentication code', { cause: new Error(), description: 'no 2fa code given' })

    if (!authenticator.verify({ secret: user.twoFactorAuthenticationSecret, token: body.twoFactorAuthenticationCode }))
      throw new ForbiddenException('Wrong authentication code', { cause: new Error(), description: 'The 2fa code do not match' })

    const fetchUser = await this.usersService.update(user.id, { isTwoFactorAuthenticated: true, isAvailable : true})
    if (!fetchUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })

    return res.status(200).send()
  }

  async generateQrCodeDataURL(otpAuthUrl: string) {
    return toDataURL(otpAuthUrl)
  }

  isTwoFactorAuthenticationValid(twoFactorAuthenticationCode: string, user: User) {
    return authenticator.verify({
      token: twoFactorAuthenticationCode,
      secret: user?.twoFactorAuthenticationSecret
    })
  }

  async turnOnTwoFactorAuthentication(user: User, res: any, body: any) {
    if (user.isTwoFactorAuthenticationEnabled) {
      throw new BadRequestException('User error', { cause: new Error(), description: '2fa is already turned on' })
    }

    if (user.twoFactorAuthenticationSecret) {
      if (!body.twoFactorAuthenticationCode)
        throw new BadRequestException('Wrong authentication code', { cause: new Error(), description: 'no 2fa code given' })
  
      if (!authenticator.verify({ secret: user.twoFactorAuthenticationSecret, token: body.twoFactorAuthenticationCode }))
        throw new ForbiddenException('Wrong authentication code', { cause: new Error(), description: 'The 2fa code do not match' })
  
      const fetchUser = await this.usersService.update(user.id, { isTwoFactorAuthenticationEnabled: true, isTwoFactorAuthenticated: true })
      if (!fetchUser)
        throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })
     }

    return res.status(200).send()
  }


  async turnOffTwoFactorAuthentication(user: User, res: any, body: any) {
    if (!user.isTwoFactorAuthenticationEnabled)
      throw new BadRequestException('User error', { cause: new Error(), description: '2fa is already turned off' })

    if (!body.twoFactorAuthenticationCode)
      throw new BadRequestException('Wrong authentication code', { cause: new Error(), description: 'no 2fa code given' })

    if (!authenticator.verify({ secret: user.twoFactorAuthenticationSecret, token: body.twoFactorAuthenticationCode }))
      throw new ForbiddenException('Wrong authentication code', { cause: new Error(), description: 'The 2fa code do not match' })

    const fetchUser = await this.usersService.update(user.id, { isTwoFactorAuthenticationEnabled: false })
    if (!fetchUser)
      throw new InternalServerErrorException('Database error', { cause: new Error(), description: 'Cannot update user' })

    return res.status(200).send()
  }

}
