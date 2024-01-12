import { IsNumber, Max } from "class-validator"
export class CreateUserDto {
	@IsNumber()
	@Max(2147483647)
	ftId: number
}