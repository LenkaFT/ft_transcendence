import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class JoinRoomDto {
    
    @MaxLength(74)
    @IsString()
    @Matches(/^[^#<>\[\]|{}\/@:=]*$/, {message: 'channel name must not contains ^ # < > [ ] | { } : @ or /'})
    @Matches(/^\w+( \w+)*$/, {message: "channel name can only have one space between group of words and cannot contains ^ # < > [ ] | { } : @ or /"})
    @MaxLength(74)
    name: string

    @IsString()
    @MinLength(6)
    @MaxLength(20)
    @IsOptional()
    password: string | null
}