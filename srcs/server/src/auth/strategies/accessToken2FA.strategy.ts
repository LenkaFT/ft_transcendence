import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "src/users/services/users.service";


@Injectable()
export class AccessToken2FAStrategy extends PassportStrategy(Strategy, 'jwt-2fa') {
	constructor( private userService: UsersService) {
		super({
			
			jwtFromRequest:ExtractJwt.fromExtractors([
				AccessToken2FAStrategy.extractJWT
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
		
		if (!user?.isTwoFactorAuthenticationEnabled)
			return user
		
		if (user?.isTwoFactorAuthenticated)
			return user

	}
}
