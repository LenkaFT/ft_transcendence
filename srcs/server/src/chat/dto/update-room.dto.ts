import { IsInt, IsOptional, IsPositive, IsString, Max, MaxLength, MinLength } from 'class-validator'

export class UpdateRoomDto{
    
    @IsInt()
    @IsPositive()
    @Max(2147483647)
    roomId? : number

    @IsString()
    @MinLength(6)
    @MaxLength(20)
    @IsOptional()
    password?: string
}
