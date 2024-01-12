import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import * as argon2 from 'argon2'
import { AuthService } from 'src/auth/services/auth.service'
import { UsersService } from 'src/users/services/users.service'
import { Repository } from 'typeorm'
import * as xss from 'xss'
import { User } from '../../users/entities/user.entity'
import { CreateMessageDto } from '../dto/create-message.dto'
import { CreateRoomDto } from '../dto/create-room.dto'
import { JoinRoomDto } from '../dto/join-room.dto'
import { UpdatePrivilegesDto } from '../dto/update-privileges.dto'
import { UpdateRoomDto } from '../dto/update-room.dto'
import { Message } from '../entities/message.entity'
import { Room, roomType } from '../entities/room.entity'


@Injectable()
export class RoomService {
    
    constructor(
        
        @InjectRepository(Room)
        private roomRepository: Repository<Room>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        @InjectRepository(Message)
        private userRepository: Repository<User>,
        private readonly userService : UsersService,
        private readonly authService : AuthService
    ) {}

    async create(createRoomDto: CreateRoomDto, user: User){

        if (createRoomDto?.password && createRoomDto.password?.length > 0)
            createRoomDto.password = await this.authService.hash(createRoomDto.password)    
    
        if(createRoomDto.privChan === true && createRoomDto.password)
            throw new ConflictException("Channel is private", {cause: new Error(), description: "You cannot have a password protected private channel"})

        if (await this.findOneByName(createRoomDto.name))
            throw new ConflictException("Channel already exists", {cause: new Error(), description: "channel name is unique, find another one"})
        const room = this.roomRepository.create({
            name: createRoomDto.name,
            password: createRoomDto?.password,
            owner: {id: user.id},
            type: roomType.groupMessage,
            privChan: createRoomDto.privChan
        })
        if (room.privChan) {
            room.whitelist = [];
            room.whitelist.push(user.id);
        }
        if (!room.users)
            room.users = []
        room.users.push(user)
        await this.save(room)
        if (room?.password)
            room.password = undefined;
        return this.removeProtectedProperties(room)
    }

    async findOneByName(name: string){
        return await this.roomRepository.findOneBy({name})
    }

    async findOneByIdWithRelations(roomId: number){
        return await this.roomRepository.findOne(
        {
            where : 
            {id : roomId}, 
            relations : 
            [
                'owner', 
                'administrator', 
                'users', 
                'users.blocked', 
                'message', 
                'muted', 
                'banned'
            ]
        })
    }

    removeProtectedProperties(room: Room) {
        room.users?.forEach((user)=> this.userService.removeProtectedProperties(user))
        room.message?.forEach((message) => this.userService.removeProtectedProperties(message.author))
        room.administrator?.forEach((user)=> this.userService.removeProtectedProperties(user))
        room.owner = this.userService.removeProtectedProperties(room.owner)
        room.muted?.forEach((user) => this.userService.removeProtectedProperties(user))
        room.banned?.forEach((user) => this.userService.removeProtectedProperties(user))
        return room
    }
    
    async createDM(user: User, user2: User, roomName: string){
        let directMessage: Room
        directMessage = this.roomRepository.create({
            name: roomName,
            type: roomType.directMessage,
            users: [user, user2]
        })    
        await this.roomRepository.save(directMessage)
        const room = await this.getRoom(roomName)

        if (!room) {
            throw new NotFoundException("Room not found", {
                cause: new Error(),
                description: "Cannot find this room in the database",
        })}
        return (room);
    }

    async getRoom(roomName: string){
        return await this.roomRepository
            .createQueryBuilder('room')
            .leftJoinAndSelect('room.message', 'message')
            .leftJoinAndSelect('message.author', 'author')
            .leftJoinAndSelect('room.users', 'user')
            .where('room.name = :name', { name: roomName })
            .orderBy('message.id', 'ASC')
            .getOne()
    }

    async getRoomById(roomId: number){

        const room = await this.roomRepository
            .createQueryBuilder('room')
            .leftJoinAndSelect('room.message', 'message')
            .leftJoinAndSelect('message.author', 'author')
            .leftJoinAndSelect('room.users', 'user')
            .where('room.id = :id', { id: roomId })
            .orderBy('message.id', 'ASC')
            .getOne()

        if (!room) {
            throw new NotFoundException("Room not found", {
                cause: new Error(),
                description: "Cannot find this room in the database",
        })}
        this.removeProtectedProperties(room);
        room.password = null;
        return(room);
    }
    
    async findAll(){
        return this.roomRepository.find()
    }

    async findAllWithoutDm() {
        let roomList = await this.roomRepository.find()

        // TO DO IS this really necessary ?
        if (!roomList) {
            throw new NotFoundException("No rooms", {
                cause: new Error(),
                description: "There are no rooms in data base",
        })}
        // 
        roomList = roomList.filter(room => room.type !== roomType.directMessage)
        roomList.forEach((room) => {
            if (room.password)
                room.password = 'isPasswordProtected'
            else
                room.password = 'none'

            this.removeProtectedProperties(room);
        })
        return roomList
    }

    findOneById(id: number){
        return this.roomRepository.findOneBy({id})
    }   
    
    async findAllUsersInRoom(id: number) {
        const room = await this.roomRepository
            .createQueryBuilder('room')
            .leftJoinAndSelect('room.users', 'user')
            .where('room.id = :id', {id})
            .getOne()
    
        if (!room){
            throw new ForbiddenException('room does not exist')
        }
        
        const usersInRoom = room.users.map(user => ({
            id: user.id,
            username: user.username,
        }))
        return usersInRoom
    }

    async update(id: number, updateRoomDto: UpdateRoomDto) {

        await this.roomRepository.update(id, updateRoomDto)
        const newRoom = await this.findOneById(id)
        if (newRoom)
          return newRoom
        throw new HttpException('Room not found', HttpStatus.NOT_FOUND)
    }

    async joinRoom(dto: JoinRoomDto, user: User){

        const room = await this.roomRepository
            .createQueryBuilder('room')
            .leftJoinAndSelect('room.message', 'message')
            .leftJoinAndSelect('room.banned', 'banned')
            .leftJoinAndSelect('room.owner','owner')
            .leftJoinAndSelect('message.author', 'author')
            .leftJoinAndSelect('room.users', 'user')
            .leftJoinAndSelect('user.blocked', 'blocked')
            .where('room.name = :name', { name: dto.name })
            .orderBy('message.id', 'ASC')
            .getOne()

        if (!room) {
            throw new NotFoundException("Room not found", {
                cause: new Error(),
                description: "Cannot find this room in the database",
        })}
        
        if (room.type === roomType.directMessage){
            throw new ConflictException('dm room', 
            {cause: new Error(), description: 'You cannot join a direct message room'})
        }

        if (room?.password && dto?.password === null || dto.hasOwnProperty('password') && dto?.password === undefined){
            throw new NotFoundException('You need a password', 
            {cause: new Error(), description: 'This channel is protected by a password.'})
        }
        
        const userRelation = await this.userService.findOneByIdWithBlockRelation(user?.id)
        if (!userRelation){
            throw new NotFoundException('User not found', 
            {cause: new Error(), description: 'User does not exist in database'})
        }
       
        if (this.isBanned(room, user)){
            throw new ConflictException('Banned user', 
            {cause: new Error(), description: 'you are banned in channel ' + room.name} )
        }
        
        if (room?.privChan && room?.owner?.id === user.id) {
            if (room?.whitelist && !room?.whitelist?.includes(user.id)) {
                throw new ForbiddenException("Private channel", {
                    cause: new Error(),
                    description: "You have to be whitelisted to join this channel",
            })
            }  
        }

        if (room.privChan === true && !room?.whitelist?.includes(user.id))
        {
            throw new ForbiddenException("Private channel", {
                cause: new Error(),
                description: "You have to be whitelisted to join this channel",
            })
        }
        
        if (room?.password?.length > 0 && room?.password && dto?.password){
            if (! await argon2.verify(room.password, dto?.password))
                throw new ForbiddenException('Password invalid')
        }
        
        if (!room.users)
            room.users = []
        
        if (!room.users.some((userToFind) => userToFind.id === user.id))
            room.users.push(user)
        else
            Logger.error('already in room')
        await this.roomRepository.save(room)
        if (userRelation.blocked && room.message) {
            room.message = room.message.filter(msg => !userRelation.blocked.some(blockedUser => blockedUser.id === msg.author.id))
        } 
        if (room?.password){
            room.password = undefined
        }
        return this.removeProtectedProperties(room)
    }

    async messageInRoom(roomId: number, userId: string){
        const room = await this.roomRepository
        .createQueryBuilder('room')
        .leftJoinAndSelect('room.message', 'message')
        .leftJoinAndSelect('room.banned', 'banned')
        .leftJoinAndSelect('room.owner','owner')
        .leftJoinAndSelect('message.author', 'author')
        .leftJoinAndSelect('room.users', 'user')
        .leftJoinAndSelect('user.blocked', 'blocked')
        .where('room.id = :id', { id: roomId })
        .orderBy('message.id', 'ASC')
        .getOne()

        if (!room) {
            throw new NotFoundException("Room not found", {
                cause: new Error(),
                description: "Cannot find this room in the database",
        })
        }

        const userRelation = await this.userService.findOneByIdWithBlockRelation(userId)
        if (!userRelation){
            throw new NotFoundException('User not found', 
            {cause: new Error(), description: 'User does not exist in database'})
        }

        if (userRelation.blocked && room.message)
            room.message = room.message.filter(msg => !userRelation.blocked.some(blockedUser => blockedUser.id === msg.author.id))
        
        if (room?.password)
            room.password = undefined
        return this.removeProtectedProperties(room)
    }

    async getInfoForInvite(roomId: number, invitedUser: string) {
        const room = await this.findOneByIdWithRelations(roomId)
        if (!room) {
            throw new NotFoundException("Room not found", {
                cause: new Error(),
                description: "Cannot find this room in the database",
        })}
        const target = await this.userService.findOneByName(invitedUser)
        if (!target) {
            throw new NotFoundException("User not found", {
                cause: new Error(),
                description: "Cannot find this user in the database",
        })}
        return {room: room, target: target}
    }

    async addTargetInWhiteList(roomId: number, invitedUser: string) {
        const room = await this.findOneById(roomId)
        if (!room) {
            throw new NotFoundException("Room not found", {
                cause: new Error(),
                description: "Cannot find this room in the database",
        })}
        const target = await this.userService.findOneById(invitedUser)
        if (!target) {
            throw new NotFoundException("User not found", {
                cause: new Error(),
                description: "Cannot find this user in the database",
        })}
        if (!room.whitelist)
            room.whitelist = []
        if (room.whitelist.includes(target.id)) {
            throw new ConflictException('User found in whitelist', {
            cause: new Error(),
            description: `${target?.username} is already whitelisted.`,
            })
        }
        else{
            room.whitelist.push(target?.id)
            await this.save(room)
        }
    }
     
    async removeUserFromWhiteList(room: Room, targetId: string){
        if (!room) {
            throw new NotFoundException("Room not found", {
                cause: new Error(),
                description: "Cannot find this room in the database",
        })}
        const target = await this.userService.findOneById(targetId)
        if (!target) {
            throw new NotFoundException("User not found", {
                cause: new Error(),
                description: "Cannot find this user in the database",
        })}
        if (room?.whitelist?.includes(targetId)) {
            room.whitelist.splice(room.whitelist.indexOf(targetId), 1)
            await this.save(room)
        }
        return room
    }

    async leaveRoom(roomId: number, userId: string){
        let room = await this.findOneByIdWithRelations(roomId)
        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            })

        if (room.users)
        {
            room.users.forEach(user =>  {
                if (user.id === userId){
                    room.users = room.users.filter(user => user.id !== userId)
                    if (room.owner?.id === userId){
                        room.owner = null
                    }
                    if (this.isAdmin(room, user) === 'isAdmin'){
                        room.administrator.splice(room.administrator.indexOf(user), 1)
                    }
                }
            })
        }
        else{
            throw new NotFoundException("No user was found in this room", 
            {
                cause: new Error(), 
                description: `cannot find any users in room ${room?.name} in database`
            })
        }
        if (room?.privChan === true){
            room = await this.removeUserFromWhiteList(room, userId)
        }
        await this.roomRepository.save(room)
    }

    async kick(roomId: number, userId: string, targetId: string){
      
        const room = await this.findOneByIdWithRelations(roomId)
        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find any users in database"
            })
        const user = await this.userService.findOneById(userId)
        if (!user)
        throw new NotFoundException("User not found", 
        {
            cause: new Error(), 
            description: "cannot find this user in database"
        })
        const user2 = await this.userService.findOneById(targetId)
        if (!user2)
        throw new NotFoundException("User not found", 
        {
            cause: new Error(), 
            description: "cannot find this user in database"
        })

        if (room.users.some((user) => user.id === user2.id) === false)
            throw new ConflictException('Not in Channel', 
            {cause: new Error(), description: user2.username + ' is not in channel ' + room.name})

        if (this.isAdmin(room, user) === 'isAdmin' && this.isAdmin(room, user2) === 'isAdmin'){
            throw new ConflictException("User are both admins", 
        {
            cause: new Error(), 
            description: "you cannot kick an admin"
        })}
        if (this.isAdmin(room, user) === 'no'){
            throw new ConflictException("You are not admin", 
        {
            cause: new Error(), 
            description: "you cannot kick if you are not admin"
        })}
        if (this.isAdmin(room, user) === 'isAdmin' && this.isAdmin(room, user2) === 'isOwner'){
            throw new ConflictException("You does not have enough power", 
        {
            cause: new Error(), 
            description: "you cannot kick an owner of channel"
        })} 
        if ((this.isAdmin(room, user) === 'isAdmin' && this.isAdmin(room, user2) === 'no') ||
        (this.isAdmin(room, user) === 'isOwner' && this.isAdmin(room, user2) === 'isAdmin') || 
        (this.isAdmin(room, user) === 'isOwner' && this.isAdmin(room, user2) === 'no'))
        {
            this.leaveRoom(room?.id, user2?.id)
            return [user?.username, user2?.username, room?.name]
        }
    }   

    async postMessage(sender: User, dto: CreateMessageDto){
        
        const room = await this.findOneByIdWithRelations(dto.roomId)
        if (!room)
        {
            throw new NotFoundException("Room not found",
            {cause: new Error(), description: "cannot find any users in database"})
        }
        
        if (this.isBanned(room, sender)) 
        {
            throw new ConflictException('Banned user', 
            {cause: new Error(), description: 'you are banned in channel ' + room.name} )
        }
        else if (room.users?.some((user) => user.id === sender.id) === false) 
        {
            throw new ConflictException('User not in channel', 
            {cause: new Error(), description: sender.username + ' is not in channel : ' + room.name} );
        }
          
        if (this.isMuted(room, sender))
            throw new ConflictException('Muted user', 
            {cause: new Error(), description: 'you are muted in channel ' + room.name})
        const msg = this.messageRepository.create({
            author: {id: sender.id , username: sender.username},
            content: xss.escapeHtml(dto.content),
            room: {id: dto.roomId}
        })
        return await this.messageRepository.save(msg)
    }
    
    async giveAdminPrivileges(requestMaker : User, updatePrivilegesDto : UpdatePrivilegesDto) {
        
        const room = await this.findOneByIdWithRelations(updatePrivilegesDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", {cause: new Error(), description: "cannot find this room in database"})
        const target = await this.userService.findOneById(updatePrivilegesDto.targetId)
        if (!target)
            throw new NotFoundException("User not found", {cause: new Error(), description: "cannot find any users in database"})

        if (room.users.some((user) => user.id === target.id) === false)
            throw new ConflictException('Not in Channel', 
            {cause: new Error(), description: target.username + ' is not in channel ' + room.name})
        else if (requestMaker?.id !== room?.owner?.id || this.isAdmin(room, requestMaker) === 'no')
            throw new ConflictException('Privileges conflict', 
            {cause: new Error(), description: 'tried to perform action above your paycheck'} )
        else if (this.isAdmin(room, target) !== 'no')
            throw new ConflictException('Privileges conflict',  
            {cause: new Error(), description: "Target user allready has privileges"} )

        if (!room.administrator)
            room.administrator = []
        room.administrator.push(target)
        const newRoom = await this.save(room)
        return this.removeProtectedProperties(newRoom)
    }

    async removeAdminPrivileges(requestMaker : User, updatePrivilegesDto : UpdatePrivilegesDto) {
        const room = await this.findOneByIdWithRelations(updatePrivilegesDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", {cause: new Error(), description: "cannot find this room in database"})
        const target = await this.userService.findOneById(updatePrivilegesDto.targetId)
        if (!target)
            throw new NotFoundException("User not found", {cause: new Error(), description: "cannot find any users in database"})

        if (room.users.some((user) => user.id === target.id) === false)
            throw new ConflictException('Not in Channel', 
            {cause: new Error(), description: target.username + ' is not in channel ' + room.name})
        else if (requestMaker.id !== room.owner.id)
            throw new ConflictException('Is not room owner', 
            {cause: new Error(), description: 'tried to perform action above your paycheck'} )
        else if (this.isAdmin(room, target) === 'no')
            throw new ConflictException('Is not admin',  
            {cause: new Error(), description: "Target user allready has no privileges"} )

        room.administrator = room.administrator.filter((admin) => admin.id != target.id)
        const newRoom = await this.save(room)
        return this.removeProtectedProperties(newRoom)
    }

    async userPrivileges(updatePrivilegesDto : UpdatePrivilegesDto) {

        const room = await this.findOneByIdWithRelations(updatePrivilegesDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", {cause: new Error(), description: "cannot find any users in database"})
        if (room.type === roomType.directMessage){
            return "no"
        }
        const target = await this.userService.findOneById(updatePrivilegesDto.targetId)
        if (!target)
            throw new NotFoundException("User not found", {cause: new Error(), description: "cannot find any users in database"})
        
        if (room.users.some((user) => user.id === target.id) === false)
            return

        if (this.isMuted(room, target))
        {
            return ('isMuted')
        }
        return (this.isAdmin(room, target))
    }

    isMuted(room : Room, user : User)
    {
        if (room.muted?.find((userToFind : User) => userToFind?.id === user?.id))
            return (true)
        return (false)
    }

    isAdmin(room : Room, user : User) {
        
        if (room.administrator?.find((userToFind : User) => userToFind?.id === user?.id))
            return ('isAdmin')
        else if (user.id === room.owner?.id)
            return ('isOwner')
        return ('no')
    }

    isBanned(room : Room, user : User) {
        if (room.banned?.find((userToFind : User) => userToFind?.id === user?.id))
            return (true)
        return (false)
    }

    async muteUser(requestMaker : User, updatePrivilegesDto : UpdatePrivilegesDto, timeInMinutes : number) {
        
        const room = await this.findOneByIdWithRelations(updatePrivilegesDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find any users in database"
            })
        if (!this.isAdmin(room, requestMaker))
            throw new ConflictException('Not an admin', 
            {
                cause: new Error(), 
                description: 'tried to perform actions above your paycheck'
            } )
        const target = await this.userService.findOneById(updatePrivilegesDto.targetId)
        
        if (!target)
            throw new NotFoundException("User not found", 
            {
                cause: new Error(), 
                description: "cannot find any users in database"
            })
        if (room.users.some((user) => user.id === target.id) === false)
            throw new ConflictException('Not in Channel', 
            {cause: new Error(), description: target.username + ' is not in channel ' + room.name})
        else if (this.isMuted(room, target)) 
        {
            throw new ConflictException('Is muted', 
            {cause: new Error(), description: 'This user is allready muted'} )
        }
        if (this.isAdmin(room, target) !== 'no' && requestMaker?.id !== room.owner?.id)
            throw new ConflictException('Target is admin', 
            {
                cause: new Error(), 
                description: 'You cannot mute an admin'
            } )


        if (timeInMinutes != 0)
        {
            setTimeout(() => {
            if (!room.muted)
                room.muted = []
            room.muted = room.muted.filter((mutedUser) => mutedUser.id != target.id)
            this.save(room)
            }, timeInMinutes * 60 * 1000)
        }
        if (!room.muted)
            room.muted = []
        room.muted.push(target)

        const newRoom = this.removeProtectedProperties(await this.save(room))
        return (newRoom)
    }

    async unmuteUser(requestMaker : User, updatePrivilegesDto : UpdatePrivilegesDto) {

        const room = await this.findOneByIdWithRelations(updatePrivilegesDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", {cause: new Error(), description: "cannot find any users in database"})
        if (!this.isAdmin(room, requestMaker))
            throw new ConflictException('Not an admin', 
            {cause: new Error(), description: 'tried to perform actions above your paycheck'} )

        const target = await this.userService.findOneById(updatePrivilegesDto.targetId)
        if (!target)
            throw new NotFoundException("User not found", {cause: new Error(), description: "cannot find any users in database"})
    
        if (room.users.some((user) => user.id === target.id) === false)
            throw new ConflictException('Not in Channel', 
            {cause: new Error(), description: target.username + ' is not in channel ' + room.name})
        else if (!this.isMuted(room, target)) {
            throw new ConflictException('Is not muted', 
            {cause: new Error(), description: 'This user is not muted'} )
        }
        if (!room.muted)
            room.muted = []
        room.muted = room.muted.filter((mutedUser) => mutedUser.id != target.id)

        const newRoom = this.removeProtectedProperties(await this.save(room))
        return (newRoom)
    }

    async banUser(requestMaker : User, updatePrivilegesDto : UpdatePrivilegesDto) {

        const room = await this.findOneByIdWithRelations(updatePrivilegesDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", {cause: new Error(), description: "cannot find any users in database"})
        if (!this.isAdmin(room, requestMaker))
            throw new ConflictException('Not an admin', 
            {cause: new Error(), description: 'tried to perform actions above your paycheck'} )

        const target = await this.userService.findOneById(updatePrivilegesDto.targetId)
        if (!target)
            throw new NotFoundException("User not found", {cause: new Error(), description: "cannot find any users in database"})

        if (room.users.some((user) => user.id === target.id) === false)
            throw new ConflictException('Not in Channel', 
            {cause: new Error(), description: target.username + ' is not in channel ' + room.name})
        else if (this.isBanned(room, target))
            throw new ConflictException('Banned already', 
            {cause: new Error(), description: target.username + ' is allready banned from ' + room.name})
        else if (this.isAdmin(room, target) !== 'no' && requestMaker?.id !== room.owner?.id)
            throw new ConflictException('Is Admin', 
            {cause: new Error(), description: target.username + ' has admin privileges in ' + room.name + 'you cannot ban them'})

        
        if (updatePrivilegesDto.timeInMinutes != 0)
        {
            setTimeout(() => {
            if (!room.banned)
                room.banned = []
            room.banned = room.banned.filter((bannedUser) => bannedUser.id != target.id)
            this.save(room)
            }, updatePrivilegesDto.timeInMinutes * 60 * 1000)
        }
        if(!room.banned)
            room.banned = []
        room.banned.push(target)
        room.users = room.users.filter((user) => user.id != target.id)
        room.administrator = room.administrator?.filter((user) => user.id != target.id)
        const newRoom = this.removeProtectedProperties(await this.save(room))
        return (newRoom)
    }

    async unbanUser(requestMaker : User, updatePrivilegesDto : UpdatePrivilegesDto) {

        const room = await this.findOneByIdWithRelations(updatePrivilegesDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", {cause: new Error(), description: "cannot find any users in database"})
        if (!this.isAdmin(room, requestMaker))
            throw new ConflictException('Not an admin', 
            {cause: new Error(), description: 'tried to perform actions above your paycheck'} )

        const target = await this.userService.findOneById(updatePrivilegesDto.targetId)
        if (!target)
            throw new NotFoundException("User not found", {cause: new Error(), description: "cannot find any users in database"})

        if (!this.isBanned(room, target))
            throw new ConflictException('Not banned', 
            {cause: new Error(), description: target.username + ' is not banned from ' + room.name})
    
        if (!room.banned)    
            room.banned = []
        room.banned = room.banned.filter((bannedUser) => bannedUser.id != target.id)

        const newRoom = this.removeProtectedProperties(await this.save(room))
        return (newRoom)
    }

    async getBanList(roomId : number)
    { 
        const room = await this.findOneByIdWithRelations(roomId)
        if (!room)
            throw new NotFoundException("Room not found", {cause: new Error(), description: "cannot find any users in database"})

        let banList : {username : string, id : string}[] = [] 
        if (!room.banned)
            room.banned = []
        room.banned.forEach((bannedUser) => {
            banList.push({username : bannedUser.username, id : bannedUser.id})
        }) 
        return (banList)
    }


    async save(room: Room) {
        const newRoom = await this.roomRepository.save(room)
        if (!newRoom)
          throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot update user'}) 
        return newRoom
    
    }

    async setPassword(user: User, updateRoomDto: UpdateRoomDto){
        if (!updateRoomDto.password){
            throw new NotFoundException("Invalid parameter", 
            {
                cause: new Error(), 
                description: "cannot find password in dto"
            })
        }
        const room = await this.findOneByIdWithRelations(updateRoomDto?.roomId)
        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            })
        if (room?.owner?.id !== user.id)
            throw new NotFoundException("Not owner", 
            {
                cause: new Error(), 
                description: "you cannot set a password if you are not owner of the channel."
            })
        if (room.password)
            throw new ConflictException("Password already exists", 
            {
                cause: new Error(),
                description: "you cannot set a password when there is already one."
            })
        room.password = await this.authService.hash(updateRoomDto?.password)
        await this.save(room);
    }

    async changePassword(user: User, updateRoomDto: UpdateRoomDto){
        if (!updateRoomDto.password){
            throw new NotFoundException("Invalid parameter", 
            {
                cause: new Error(), 
                description: "cannot find password in dto"
            })
        }
        const room = await this.findOneByIdWithRelations(updateRoomDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            })
        if (room?.owner.id !== user.id)
            throw new NotFoundException("Not owner", 
            {
                cause: new Error(), 
                description: "you cannot change password if you are not owner of the channel."
            })
        if (!room.password)
            throw new ConflictException("Password does not exists", 
            {
                cause: new Error(),
                description: "you cannot change a password when there is no password."
            })
        if (await argon2.verify(room.password, updateRoomDto.password)){
            throw new ConflictException("Password is the same", 
            {
                cause: new Error(),
                description: "you cannot change password for the same password."
            })
        }
        room.password = await this.authService.hash(updateRoomDto.password)
        await this.save(room)
    }

    async removePassword(user: User, updateRoomDto: UpdateRoomDto){
        const room = await this.findOneByIdWithRelations(updateRoomDto.roomId)
        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            })
        if (room?.owner.id !== user.id)
            throw new NotFoundException("Not owner", 
            {
                cause: new Error(), 
                description: "you cannot remove password if you are not owner of the channel."
            })
        if (!room.password)
            throw new ConflictException("Password does not exists", 
            {
                cause: new Error(),
                description: "You cannot remove a password when there is no password."
            })
        room.password = null
        await this.save(room)
    }

    async isPriv(roomId : number) {

        const room = await this.findOneByIdWithRelations(roomId);

        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            });
        return (room.privChan);
    }

    async isInRoom(user : User, roomId : number) {
        const room = await this.findOneByIdWithRelations(roomId);

        if (!room)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            });

        if (!user)
            throw new NotFoundException("User not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            });
        if (room.users?.some(chanUser => chanUser.id === user.id))
            return (true)
        return (false);
    }
}