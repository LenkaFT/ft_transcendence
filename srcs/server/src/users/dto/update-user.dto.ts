import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsInt, IsJWT, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'
import { Game } from 'src/game/entities/game-entity'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(CreateUserDto) {
	@IsString()
	@MinLength(3)
	@MaxLength(20)
	@Matches(/^[^#<> \[\]|{}\/@:=]*$/, {message: 'username must not contains ^ # < > [ ] | { } : @ or / " " '})
	@IsOptional()
	username?: string

	@IsJWT()
	@IsOptional()
	refreshToken?: string

	@IsBoolean()
	@IsOptional()
	isRegistered?: boolean

	@IsBoolean()
	@IsOptional()
	isLogged?: boolean

	@IsOptional()
	@IsString()
	twoFactorAuthenticationSecret?: string

	@IsBoolean()
	@IsOptional()
	isTwoFactorAuthenticationEnabled?: boolean

	@IsBoolean()
	@IsOptional()
	isTwoFactorAuthenticated?: boolean

	@IsInt()
	@Min(0)
	@Max(2147483647)
	@IsOptional()
	winsAmount?: number

	@IsInt()
	@Min(0)
	@Max(2147483647)
	@IsOptional()
	loosesAmount?: number

	@IsBoolean()
	@IsOptional()
	isAvailable?: boolean

	@IsArray()
	@Type(() => String)
	@IsOptional()
	gameSockets?: string[]

	@IsArray()
	@Type(() => String)
	@IsOptional()
	chatSockets?: string[]

	@IsArray()
	@Type(() => Game)
	@IsOptional()
	playedGames?: Game[]
	
}
