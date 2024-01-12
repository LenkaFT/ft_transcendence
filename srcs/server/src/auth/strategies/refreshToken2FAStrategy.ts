import { Injectable, Req } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "src/users/services/users.service";

@Injectable()
export class RefreshToken2FAStrategy extends PassportStrategy(Strategy, 'jwt-refresh-2fa') {
	constructor(private userService: UsersService) {
		super({
			jwtFromRequest:ExtractJwt.fromExtractors([
				RefreshToken2FAStrategy.extractJWT
			  ]),
			secretOrKey: process.env.JWT_REFRESH_SECRET,
		})
	}

	private static extractJWT(req: any): string | null {
		if (
		  req.cookies &&
		  'refreshToken' in req.cookies &&
		  req.cookies?.refreshToken?.length > 0
		) {
		  return req.cookies?.refreshToken;
		}
		return null;
	  }

	async validate(@Req() req: any, payload: any) {
		const user = await this.userService.findOneById(payload?.id)
		if (!user?.isTwoFactorAuthenticationEnabled)
			return user
		
		if (user?.isTwoFactorAuthenticated)
			return user

	}
}