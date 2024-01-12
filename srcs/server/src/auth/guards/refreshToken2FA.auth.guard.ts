import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from 'src/users/services/users.service';

@Injectable()
export class RefreshToken2FAGuard extends AuthGuard('jwt-refresh-2fa') {
	constructor(
		private jwtService: JwtService,
		private userService: UsersService

	  ) {
		super();
	  }

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const refreshToken = request.cookies['refreshToken']
		try {
			await this.jwtService.verifyAsync(refreshToken, {secret: process.env.JWT_REFRESH_SECRET})
		} catch(err) {
			const payload = await this.jwtService.decode(refreshToken)
			if (!payload)
				throw new UnauthorizedException('Access denied', {cause: new Error(), description: `invalid token`})
			const user = await this.userService.findOneById(payload['id'])
			if (!user)
				throw new UnauthorizedException('Access denied', {cause: new Error(), description: `cannot find user`})

			await this.userService.update(user.id, {isLogged: false})
			
			throw new UnauthorizedException('Access denied', {cause: new Error(), description: `invalid token`})
		}
		const parentCanActivate = (await super.canActivate(context)) as boolean; 
		return parentCanActivate

	  }

	handleRequest(err: any, user: any, info: any, context: any, status: any) {
		if (err || !user) {
			throw new UnauthorizedException('Access denied', {cause: new Error(), description: `Invalid token`})
		}
		return super.handleRequest(err, user, info, context, status);
	  }	
}