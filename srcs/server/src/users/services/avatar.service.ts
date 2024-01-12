import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Avatar } from "../entities/avatar.entity";

@Injectable()
export class AvatarService {
	constructor(
		@InjectRepository(Avatar)
		private avatarRepository: Repository<Avatar>,
	) {}

	async create(dataBuffer: Buffer, filename: string) {
		const newAvatar = await this.avatarRepository.create({
			filename,
			data: dataBuffer
		})
		await this.avatarRepository.save(newAvatar)
		return newAvatar
	}

	async getAvatarById(id: string) : Promise<Avatar> {
		const avatar = await this.avatarRepository.findOneBy({id})
		if (!avatar)
			throw new NotFoundException()
		return avatar
	}
}