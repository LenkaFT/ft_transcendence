import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Room } from './room.entity';

@Entity()
export class Message { 
    
    @PrimaryGeneratedColumn()
    id: number

    @Column({nullable: true})
    content : String;

    @OneToOne(() => User, user => user.id, {createForeignKeyConstraints: false})
    @JoinColumn()
    author : User

    @CreateDateColumn({ type: 'timestamptz'})
	sendAt: string | Date;

    @ManyToOne(() => Room, room => room.message, {onDelete:'CASCADE'})
    room: Room;
}