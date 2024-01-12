import { IsInt, IsNumber, IsOptional, IsPositive, IsUUID, Max, Min } from "class-validator";

export class UpdatePrivilegesDto {

    @IsUUID()
    targetId: string

    @IsInt()
    @IsPositive()
    @Max(2147483647)
    roomId : number
    
    @IsInt()
    @IsOptional()
    @Min(0)
    @Max(120)
    timeInMinutes : number
}