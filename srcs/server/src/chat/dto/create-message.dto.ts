import { IsInt, IsPositive, IsString, Matches, Max, MaxLength, MinLength } from "class-validator";

export class CreateMessageDto {

    @IsString()
    @MinLength(1)
    @Matches(/^(?!\s*$).+/, {message: "message must not contains only spaces"})
	@MaxLength(1000)
    content : string

    @IsInt()
    @IsPositive()
    @Max(2147483647)
    roomId : number
}

