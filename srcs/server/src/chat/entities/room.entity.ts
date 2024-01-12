import { User } from 'src/users/entities/user.entity';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Message } from './message.entity';

export enum roomType {
    directMessage = 'dm',
    groupMessage = 'gm'
}

@Entity()
export class Room { 
    @PrimaryGeneratedColumn()
    id: number

    @Column({type: String, unique: true, nullable: true})
    name: string

    @Column({type: String, nullable: true})
    password: string

    @Column({type: Boolean, nullable: true})
    privChan: boolean

    @Column({type: 'enum', enum: roomType, nullable: true})
    type: roomType

    @Column({type : 'text', default : null, array : true, nullable : true})
    whitelist: string[]

    @ManyToOne(() => User, user => user.id)
    owner: User

    @ManyToMany(() => User, user => user.id)
    @JoinTable()
    administrator: User[]

    @ManyToMany(() => User, user => user.id)
    @JoinTable()
    muted: User[]

    @ManyToMany(() => User, user => user.id)
    @JoinTable()
    banned: User[]

    @ManyToMany(() => User, user => user.room)
    @JoinTable()
    users: User[]

    @OneToMany(() => Message, message => message.room , {onDelete:'CASCADE'} )
    message: Message[]
}