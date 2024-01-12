
import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Injectable()
export class FtAuthGuard implements CanActivate {
	constructor(private authService: AuthService) { }

	async canActivate(context: ExecutionContext  ): Promise<any>{
		const req = context.switchToHttp().getRequest()
		const code = req.query.code
		
		if (!code?.length)
			throw new UnauthorizedException('Access denied', {cause: new Error(), description: `no code provided`})
		
		const token = await this.authService.getFtToken(code)
		if (!token)
			throw new UnauthorizedException('Access denied', {cause: new Error(), description: `cannot fetch 42 token`})
			
		const ftId = await this.authService.getFtId(token)
		if (!ftId)
			throw new UnauthorizedException('Access denied', {cause: new Error(), description: `cannot fetch 42 id`})
	
		req.user = await this.authService.validateUser(ftId)
		if (!req.user)
			throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot create or validate user'})
		
		return true
	}
}
