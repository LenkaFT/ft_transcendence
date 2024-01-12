import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { leaderboardStats } from 'src/game/globals/interfaces';
import { Readable } from 'stream';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { AvatarService } from './avatar.service';

import { Server } from 'socket.io';
import { FriendRequest } from '../entities/friendRequest.entity';
import { FriendRequestStatus } from '../entities/friendRequestStatus.type';

@Injectable()
export class UsersService {

  constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,

    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,   

    private readonly avatarService: AvatarService,
	) {}

  async create(createUserDto: CreateUserDto) {
    
		const newUser = this.userRepository.create(createUserDto)
    if (!newUser)
      throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot update user'})

		const user = await this.userRepository.save(newUser)
    if (!user)
      throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot update user'})
    
    return this.removeProtectedProperties(user)
  }


  async findAll() {
    let res = await this.userRepository.find({relations :{
      playedGames: true,
      sentFriendRequests: true,
      receivedFriendRequests: true
    }})

    if (!res || res === undefined)
      throw new NotFoundException("Users not found", {cause: new Error(), description: "cannot find any users in database"})
  
    return res.map( (user) => this.removeProtectedProperties(user))
  }


  async findAllUsers(originalUser: User) {
    let res = await this.userRepository.find({relations :{
      playedGames: true,
      sentFriendRequests: true,
      receivedFriendRequests: true
    }})

    if (!res || res === undefined)
      throw new NotFoundException("Users not found", {cause: new Error(), description: "cannot find any users in database"})

    return await Promise.all(res.map( async (user) => {
      let newUser = this.removeProtectedProperties(user)
      newUser.isFriend = (await this.isFriend(user.id, originalUser)).isFriend
      return newUser
    }))

  }

  
  findOneById(id: string) {
    return this.userRepository.findOneBy({ id })
  }
  
  async findOneByName(username: string){
    return await this.userRepository.findOneBy({username})
}

  async findOneByIdWithBlockRelation(id: string) {
    const user = await this.userRepository
    .createQueryBuilder('user')
      .leftJoinAndSelect('user.blocked', 'blocked')
      .leftJoinAndSelect('user.room', 'room.users')
      .where('user.id = :id', {id: id})
      .getOne()
      if (!user)
        throw new NotFoundException("Users not found", {cause: new Error(), description: "cannot find any users in database"})
      return user
    }

  async findOneByIdWithRoomRelation(id: string) {
    const user = await this.userRepository
    .createQueryBuilder('user')
      .leftJoinAndSelect('user.room', 'room.users')
      .where('user.id = :id', {id: id})
      .getOne()
      if (!user)
        throw new NotFoundException("Users not found", {cause: new Error(), description: "cannot find any users in database"})
      return user
    }

  async findAllBlockedUser(id: string){
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.blocked', 'blocked')
      .where('user.id = :id', {id: id})
      .getOne()
    if (!user)
      throw new NotFoundException("Users not found", {cause: new Error(), description: "cannot find any users in database"})
    return user.blocked
  }
    
    findOneByFtId(ftId: number) {
    return this.userRepository.findOneBy({ ftId })
  }
  
  findOneByUsername(username: string) {
    return this.userRepository.findOneBy({ username })
  }


  findOneWitOptions(options: any) {
    return this.userRepository.findOne(options)
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const result = await this.userRepository.update(id, updateUserDto)
    if (!result)
      throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot update user'})

    const user = await this.findOneById(id)
    return this.removeProtectedProperties(user)
  }

  async save(user: User) {
    const newUser = await this.userRepository.save(user)
    if (!newUser)
      throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot update user'}) 
    return this.removeProtectedProperties(newUser)

  }

  removeProtectedProperties(user: User) {
    if (!user)
      return (user)
    if (user.refreshToken)
      user.refreshToken = undefined
    if (user.twoFactorAuthenticationSecret)
      user.twoFactorAuthenticationSecret = undefined
    return user
  }

  
  async addAvatar(id: string, dataBuffer: Buffer, filename: string) {
    const avatar = await this.avatarService.create(dataBuffer, filename)
    if (!avatar)
      throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot create avatar'})

    await this.userRepository.update(id, {
      avatarId: avatar.id
    })
    return avatar
  }

  async getAvatar(id: string) {
    
    const user = await this.userRepository.findOneBy({id})

    if (!user)
      throw new NotFoundException('User not found', {cause: new Error(), description: 'the user do not exist in database'})

    if (!user.avatarId)
      throw new NotFoundException('Avatar not found', {cause: new Error(), description: 'the avatar do not exist in database (probably not setup yet)'})
      
    const avatar = await this.avatarService.getAvatarById(user.avatarId)

    if (!avatar)
      throw new NotFoundException('Avatar not found', {cause: new Error(), description: 'the avatar do not exist in database (probably not setup yet)'})
    
    return avatar
  }


  async blockTarget(blockerId: string, targetId: string){
    
    const user = await this.findOneByIdWithBlockRelation(blockerId)
    const user2 = await this.findOneById(targetId)
    if (!user || !user2)
      throw new NotFoundException('User not found', {cause: new Error(), description: 'the user do not exist in database'})
    else if (user.id === user2.id)
      throw new ConflictException('Is yourself', {cause: new Error(), description: 'An user can\'t block itself'})

    if (this.isAlreadyBlocked(user, user2) === false){
      user.blocked.push(user2)
      await this.save(user)
      return user2.username
    }
    else
      throw new ConflictException('User already blocked', {cause: new Error(), description: 'user is already blocked'})
  }
  
  async unblockTarget(blockerId: string, blockedId: string){
    
    try{
      let user = await this.findOneByIdWithBlockRelation(blockerId)
      const user2 = await this.findOneById(blockedId)
      if (!user || !user2)
        throw new NotFoundException('User not found', {cause: new Error(), description: 'the user do not exist in database'})

      if (this.isAlreadyBlocked(user, user2)){
        user.blocked = user.blocked.filter((blockedUser) => blockedUser.id !== user2.id)
        this.userRepository.save(user)
        return {user, user2}
      }
    }
    catch(err){
      throw new NotFoundException('User not found', {cause: new Error(), description: 'the user do not exist in database'})
    }
  }

  async isBlocked(user : User, targetId : string) {

    const currentUser = await this.findOneByIdWithBlockRelation(user.id)
    if (!currentUser)
      throw new NotFoundException('User not found', {cause: new Error(), description: 'the user do not exist in database'})
    const target = await this.findOneByIdWithBlockRelation(targetId)
    if (!target)
      throw new NotFoundException('User not found', {cause: new Error(), description: 'the user do not exist in database'})

    return (this.isAlreadyBlocked(currentUser, target));
  }

  isAlreadyBlocked(user: User, userToVerify: User): boolean {
    
    const isBlocked = user.blocked?.some((userToFind: User) => userToFind.id === userToVerify.id);
    return isBlocked || false;
  }
  

  async getUserAvatar( res: any, id: string) {

    if(id && !isUUID(id))
      throw new BadRequestException('Invalid id', {cause: new Error(), description: `ID '${id}' is not an UUID`})

    try {
      const avatar = await this.getAvatar(id)
      const stream = Readable.from(avatar?.data)
      
      res.set({
        'Content-Disposition':`inline; filename="${avatar?.filename}"`,
        'Content-Type' :'image'
      })
  
      return new StreamableFile(stream)
    }
    catch (e) {
      throw e
    }
  }


  async remove(id: string) {
    const user = await this.findOneById(id)
    const removedUser = await this.userRepository.remove(user)
    return this.removeProtectedProperties(removedUser)
  }

  async removeAll() {
    const users = this.findAll();
    (await users).forEach((value) => {
      this.userRepository.remove(value);
    });
  }

  returnScoreList(){

    function winRatioCalculator(w : number, l : number) {
        
      if (l === 0 && w === 0)
          return (0);
      if (l === 0)
          return (100);

      const ratio = w * 100 / (w + l);
      
      return (Math.trunc(ratio))
    }
    return (this.findAll().then((res : User[]) => {
      let scoreList : leaderboardStats[] = []; 

      res?.forEach(async (value) => {
        if (value.isRegistered === true)
        {
          scoreList.push({username : value.username, id : value.id,winsAmount : value.winsAmount, loosesAmount : value.loosesAmount,
          WLRatio : winRatioCalculator(value.winsAmount, value.loosesAmount)});
        }
      })
      return (scoreList);
    }));
  }
  

  async returnProfile(userId : string) {
    try {
      const user = await this.findOneById(userId);
      if (user === undefined)
        throw new NotFoundException("Users not found", {cause: new Error(), description: "cannot find any users in database"})
      return ({username : user.username, id : user.id, winsAmount : user.winsAmount, loosesAmount : user.loosesAmount})
    }
    catch (err) {
      throw new NotFoundException("Users not found", {cause: new Error(), description: "cannot find any users in database"})
    }
  }

  // ==================================================================== //
  // ============================== FRIENDS ============================= //
  // ==================================================================== //

  async getRequestSentOrReceived(creator: User, receiver: User) {
    const requestSent = await this.friendRequestRepository
      .createQueryBuilder('friendRequest')
      .leftJoinAndSelect('friendRequest.creator', 'creator')
      .leftJoinAndSelect('friendRequest.receiver', 'receiver')
      .where('friendRequest.creator = :creator', {creator: creator.id})
      .andWhere('friendRequest.receiver = :receiver', {receiver: receiver.id})
      .getOne()
    
    const requestReceived = await this.friendRequestRepository
    .createQueryBuilder('friendRequest')
    .leftJoinAndSelect('friendRequest.creator', 'creator')
    .leftJoinAndSelect('friendRequest.receiver', 'receiver')
    .where('friendRequest.creator = :creator', {creator: receiver.id})
    .andWhere('friendRequest.receiver = :receiver', {receiver: creator.id})
    .getOne()

    if (!requestSent && !requestReceived)
      return undefined
    
    return (requestSent ? requestSent : requestReceived)
  }

  async sendFriendRequest(receiverId: string, creator: User, res:any) {
    if (receiverId === creator.id)
      throw new ConflictException("Conflicts between creater and receiver", {cause: new Error(), description: "creator cannot be receiver"})
    
    const receiver = await this.findOneById(receiverId)
    if (!receiver)
      throw new BadRequestException("User not found", {cause: new Error(), description: "cannot find receiver in database"})

    const originalRequest = await this.getRequestSentOrReceived(creator, receiver)
    if (originalRequest?.status === 'accepted' || originalRequest?.status === 'pending')
      throw new ConflictException("Cannot send friend frequest", {cause: new Error(), description: "A friend request has already been sent or received to your account"})

    const friendRequest = await this.friendRequestRepository.save({creator, receiver, status:'pending'})
    if (!friendRequest)
      throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot create friend request'})

    return res.status(200).send({
      status: friendRequest.status,
      id: friendRequest.id,
      creator:{id:friendRequest.creator.id},
      receiver:{id:friendRequest.receiver.id},
    })
  }

  async getFriendRequest(receiverId: string, creator: User, res: any) {
    if (receiverId === creator.id)
      throw new ConflictException("Conflicts between creater and receiver", {cause: new Error(), description: "creator cannot be receiver"})
    
    const receiver = await this.findOneById(receiverId)
    if (!receiver)
      throw new BadRequestException("User not found", {cause: new Error(), description: "cannot find receiver in database"})

    const request = await this.getRequestSentOrReceived(creator, receiver)
    if (!request)
      return res.status(200).send({status: 'undefined'})

    return res.status(200).send(
      {
        status: request.status,
        isCreator: request.creator.id === creator.id ? true : false,
        id: request.id,
      })
  }

  async getFriendRequestById(friendRequestId: number) {
    return await this.friendRequestRepository
      .createQueryBuilder('friendRequest')
      .leftJoinAndSelect('friendRequest.creator', 'creator')
      .leftJoinAndSelect('friendRequest.receiver', 'receiver')
      .where('friendRequest.id = :id', {id: friendRequestId})
      .getOne()
  }

  async respondToFriendRequest(friendRequestId: number, status: FriendRequestStatus, res: any) {
    const friendRequest = await this.getFriendRequestById(friendRequestId)
    if (!friendRequest)
      throw new BadRequestException('Bad Request', {cause: new Error(), description: 'cannot find friend request'})

    if (friendRequest.status !== "pending")
      throw new ConflictException('Friend request status', {cause: new Error(), description: 'friend request has already been responded'})

    if (!["accepted", "pending"].includes(status))
      throw new BadRequestException('Invalid status', {cause: new Error(), description: 'status should be "accepted", "pending"'})


    const newFriendRequest = await this.friendRequestRepository.save({...friendRequest, status: status})
    if (!newFriendRequest)
      throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'cannot update friend request'})
    
      return res.status(200).send(newFriendRequest)
  }

  async removeFriend(friendRequestId: number, res: any) {
    const friendRequest = await this.getFriendRequestById(friendRequestId)
    if (!friendRequest)
      throw new BadRequestException('Database error', {cause: new Error(), description: 'cannot find friend request'})

    await this.friendRequestRepository.remove(friendRequest)
    friendRequest.creator = this.removeProtectedProperties(friendRequest.creator)
    friendRequest.receiver = this.removeProtectedProperties(friendRequest.receiver)
    return res.status(200).send(friendRequest)
  }

  async getFriendRequestFromRecipients(user: User, res:any) {
    const friendRequests = await this.friendRequestRepository
      .createQueryBuilder('friendRequest')
      .leftJoinAndSelect('friendRequest.creator', 'creator')
      .leftJoinAndSelect('friendRequest.receiver', 'receiver')
      .where('friendRequest.receiver = :receiver', {receiver: user.id})
      .andWhere('friendRequest.status = :status', {status: 'pending'})
      .getMany()

    if (!friendRequests)
      throw new NotFoundException('Friend requests', {cause: new Error(), description: `cannot find any friend requests for user ${user.id}`})
    
      return res.status(200).send(friendRequests.map((friendRequest) => {
        friendRequest.creator = this.removeProtectedProperties(friendRequest.creator)
        friendRequest.receiver = this.removeProtectedProperties(friendRequest.receiver)
        return friendRequest
      }))
  }

  async getFriends(user: User, res:any) {
    const friends = await this.friendRequestRepository
      .createQueryBuilder('friendRequest')
      .leftJoinAndSelect('friendRequest.creator', 'creator')
      .leftJoinAndSelect('friendRequest.receiver', 'receiver')
      .where(subQuery => {
        subQuery.where('friendRequest.creator = :creator', {creator: user.id})
        subQuery.orWhere('friendRequest.receiver = :receiver', {receiver: user.id})
      })
      .getMany()
    
    if (!friends)
      throw new NotFoundException('Friend requests', {cause: new Error(), description: `cannot find any friends for user ${user.id}`})

    return res.status(200).send(friends.filter(friendRequest => friendRequest.status === 'accepted').map((friendRequest) => {
      if (friendRequest.creator.id === user.id)
        return this.removeProtectedProperties(friendRequest.receiver)
      else
        return this.removeProtectedProperties(friendRequest.creator)
    }))
  }

  async getRequests(user: User, res:any) {
    const friends = await this.friendRequestRepository
      .createQueryBuilder('friendRequest')
      .leftJoinAndSelect('friendRequest.creator', 'creator')
      .leftJoinAndSelect('friendRequest.receiver', 'receiver')
      .where(subQuery => {
        subQuery.where('friendRequest.creator = :creator', {creator: user.id})
        subQuery.orWhere('friendRequest.receiver = :receiver', {receiver: user.id})
      })
      .andWhere('friendRequest.status = :status', {status: 'pending'})
      .getMany()
    
    if (!friends)
      throw new NotFoundException('Friend requests', {cause: new Error(), description: `cannot find any friends for user ${user.id}`})

    return res.status(200).send(friends.map((friendRequest) => {
      if (friendRequest.creator.id !== user.id)
        return ({creatorId : friendRequest.creator.id, creatorName : friendRequest.creator.username})
    }))
  }


  async isFriend(targetUserId: string, originalUser:User) {

    const targetUser = await this.findOneById(targetUserId)
    if (!targetUser)
      throw new BadRequestException("User not found", {cause: new Error(), description: "cannot find target user in database"})

    const sendRequest = await this.friendRequestRepository
      .createQueryBuilder('friendRequest')
      .leftJoinAndSelect('friendRequest.creator', 'creator')
      .leftJoinAndSelect('friendRequest.receiver', 'receiver')
      .where('friendRequest.creator = :creator', {creator: targetUser.id})
      .andWhere('friendRequest.receiver = :receiver', {receiver: originalUser.id})
      .getOne()
    
    const receivedRequest = await this.friendRequestRepository
      .createQueryBuilder('friendRequest')
      .leftJoinAndSelect('friendRequest.creator', 'creator')
      .leftJoinAndSelect('friendRequest.receiver', 'receiver')
      .where('friendRequest.creator = :creator', {creator: originalUser.id})
      .andWhere('friendRequest.receiver = :receiver', {receiver: targetUser.id})
      .getOne()
    
    return {isFriend: sendRequest?.status === 'accepted' || receivedRequest?.status === 'accepted'}
  }

}
