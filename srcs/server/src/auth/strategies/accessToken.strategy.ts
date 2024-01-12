import { ForbiddenException, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "src/users/services/users.service";


@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor( private userService: UsersService) {
		super({
			
			jwtFromRequest:ExtractJwt.fromExtractors([
				AccessTokenStrategy.extractJWT
			  ]),
			secretOrKey: process.env.JWT_ACCESS_SECRET,
		})
	}

	private static extractJWT(req: any): string | null {
		if (
		  req.cookies &&
		  'accessToken' in req.cookies &&
		  req.cookies?.accessToken?.length > 0
		) {
		  return req.cookies?.accessToken;
		}
		return null;
	  }

	async validate(payload: any) {
		const user = await this.userService.findOneById(payload?.id)
		if (user)
			return user
		throw new ForbiddenException('Access denied', {cause: new Error(), description: `Cannot find user`})
	}
}
