import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { User } from "src/users/entities/user.entity";

export class CreateRoomDto {
    
    @IsString()
    @Matches(/^[^#<>\[\]|{}\/@:=]*$/, {message: 'channel name must not contains ^ # < > [ ] | { } : @ or /'})
    @Matches(/^\w+( \w+)*$/, {message: "channel name can only have one space between group of words and cannot contains ^ # < > [ ] | { } : @ or /"})
    @MaxLength(74)
    name: string
    
    @IsBoolean()
    privChan: boolean
    
    @IsString()
    @MinLength(6)
    @MaxLength(20)
    @IsOptional()
    password: string

    @Type(() => User)
    owner: User

    @IsArray()
	@Type(() => User)
    @IsOptional()
    administrator: User[]
}