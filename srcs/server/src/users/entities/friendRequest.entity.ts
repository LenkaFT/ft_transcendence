import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FriendRequestStatus } from "./friendRequestStatus.type";
import { User } from "./user.entity";

@Entity('')
export class FriendRequest {
	@PrimaryGeneratedColumn()
	id: number

	@ManyToOne( () => User, (user) => user.sentFriendRequests, {onDelete: 'CASCADE'})
	creator: User

	@ManyToOne(() => User, (user) => user.receivedFriendRequests, {onDelete: 'CASCADE'})
	receiver: User

	@Column()
	status: FriendRequestStatus
}