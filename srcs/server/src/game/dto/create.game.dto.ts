import { IsNumber, IsPositive, IsString, IsUUID, Matches, Max, MaxLength, MinLength } from "class-validator";
export class CreateGameDto {
	
    @IsUUID()
    winnerId : string;
    
    @IsUUID()
    looserId : string;

	@IsString()
	@MinLength(3)
	@MaxLength(20)
	@Matches(/^[^#<>\[\]|{}\/@:=]*$/, {message: 'username must not contains ^ # < > [ ] | { } : @ or /'})
    winnerUsername : string;

	@IsString()
	@MinLength(3)
	@MaxLength(20)
	@Matches(/^[^#<>\[\]|{}\/@:=]*$/, {message: 'username must not contains ^ # < > [ ] | { } : @ or /'})
    looserUsername : string;

    @IsNumber()
    @IsPositive()
    @Max(10)
    winnerScore : number;

    @IsNumber()
    @IsPositive()
    @Max(10)
    looserScore : number;
}