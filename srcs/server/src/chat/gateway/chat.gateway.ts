import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/services/auth.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/services/users.service';
import { RoomService } from '../services/room.service';

class ChatDTO {
  clientID: string[] = [];
}

interface liveMessage {
  author: {id: string, username: string}
  content: string
  id: number
  room: {id: number}
  sendAt: Date | string
};

@WebSocketGateway({ cors: true }) 
export class ChatGateway implements OnGatewayConnection,  OnGatewayDisconnect {
  constructor(
    private readonly userService : UsersService,
    private readonly authService : AuthService,
    private readonly roomService : RoomService
    ){}

  chatDTO: ChatDTO = new ChatDTO;
  @WebSocketServer()
  server : Server;

  async handleConnection (client: Socket) {
    Logger.log("Connection of socket ID : " + client.id);
    this.chatDTO.clientID.push(client.id);
    try 
    {
        if (client.handshake.query.type !== 'chat')
          return ;
        if (client.handshake.query?.userId as string === undefined)
        {
            client.disconnect();
            return ;
        }
        const payload = await this.authService.validateAccessJwt(client.handshake.query.token as string);
        client.join(`user-${payload.id}`)
        const user : User = await this.userService.findOneByIdWithRoomRelation(payload.id);
        user.room.forEach((room) => {
          client.join(`room-${room.id}`);
        })
    }
    catch(err) {
        client.disconnect();
        Logger.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
    }
  }

  async handleDisconnect(client: Socket) {  
    Logger.log("Disonnection of socket ID : " + client.id);
    this.chatDTO.clientID = this.chatDTO.clientID.filter(id => id != client.id);
  }
  
  @SubscribeMessage('joinRoom')
  joinRoom(@MessageBody() roomId: number, @ConnectedSocket() client : Socket): void {
    if (typeof roomId !== "number"){
      Logger.error("Wrong type for parameter")
      return 
    }
    client.join(`room-${roomId}`)
    this.server.to(`room-${roomId}`).emit('userJoined', roomId);
    Logger.log(`User with ID: ${client.id} joined room ${roomId}`)
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(@MessageBody() roomId: number, @ConnectedSocket() client: Socket){
    if (typeof roomId !== "number"){
      Logger.error("Wrong type for parameter")
      return 
    }
    
    try{
      const userId =  client.handshake.query?.userId as string
      await this.roomService.leaveRoom(roomId, userId)
      this.server.to(`user-${userId}`).emit('channelLeft')
      this.server.to(`room-${roomId}`).emit('userLeft')
      client.leave(`room-${roomId}`)
    }
    catch(err){
      Logger.error(err)
    }
  }

  @SubscribeMessage('kick')
  async kick(@MessageBody() data: {roomId: number, targetId: string}, @ConnectedSocket() client: Socket){
    if (
      !data ||
      typeof data.roomId !== "number" ||
      typeof data.targetId !== "string"
      )
    {
      Logger.error("Wrong type for parameter")
      return 
    }
    const userId = client.handshake.query?.userId as string
    try{
      const array = await this.roomService.kick(data.roomId, userId, data.targetId)

      this.server.to(`user-${data.targetId}`).emit('kickBy', array[0],  array[2])
      this.server.to(`user-${userId}`).emit('kicked', array[1])
      this.server.to(`room-${data.roomId}`).emit('userLeft', data.roomId);
    }
    catch(err){
      this.server.to(`user-${userId}`).emit('kickedError', err)
      Logger.error(err)
    }
  }
  
  @SubscribeMessage('sendMessage')
  async sendMessage(@MessageBody() data: liveMessage, @ConnectedSocket() client : Socket) {
    if (
      !data || 
      typeof data.room.id !== 'number' || 
      typeof data.author.id !== 'string' || 
      typeof data.content !== 'string' || 
      typeof data.author.username !== 'string' ||
      typeof data.sendAt != "string")
    {
      Logger.error("Wrong type for parameter")
      return 
    }
    const room = await this.roomService.findOneByIdWithRelations(data.room?.id)
    if (!room){
      Logger.error(`Room ${data.room.id} was not found in the database`)
      return
    }
    const sender = await this.userService.findOneById(client.handshake.query?.userId as string)
    if (!sender){
      Logger.error(`User ${client.handshake.query?.userId} was not found in the database`)
      return
    }
    room.users.forEach((user) => {
      const isBlocked = user.blocked?.some((userToFind: User) => userToFind.id === sender.id);
      
      if (!isBlocked) {
        client.to(`user-${user.id}`).emit("receiveMessage", data);
      }
    });
  }

  @SubscribeMessage('unblock')
  async unblock(@MessageBody() data: {targetId: string}, @ConnectedSocket() client: Socket){
    if (!data || typeof data.targetId !== "string"){
      Logger.error("Wrong type for parameter")
      return 
    }
    try{
      const res = await this.userService.unblockTarget(client.handshake.query?.userId as string, data.targetId)
      this.server.to(`user-${res.user.id}`).emit("unblocked", {username: res.user.username, username2: res.user2.username})
      this.server.to(`user-${res.user.id}`).emit("rerenderMessage")
      this.server.to(`user-${res.user2.id}`).emit("unblocked2", {username: res.user.username, username2: res.user2.username})
    }
    catch(err){
      Logger.error(err)
    }
  }

  @SubscribeMessage('triggerRerenderMessage')
  async triggerRerenderMessage(@ConnectedSocket() client: Socket){
    this.server.to(`user-${client.handshake.query.userId as string}`).emit('rerenderMessage')
  }

  @SubscribeMessage('DM')
  async directMessage(@MessageBody() data: { targetId: string }, @ConnectedSocket() client: Socket) {
      if (!data || typeof data.targetId !== "string") {
          Logger.error("Wrong type for parameter")
          return;
      }

      try {
          const user = await this.userService.findOneByIdWithBlockRelation(client.handshake.query?.userId as string)
          const user2 = await this.userService.findOneByIdWithBlockRelation(data.targetId)
          await this.createOrJoinDMRoom(user, user2, this.server, client)
      } catch (err) {
        Logger.error(err)
      }
  }

  async createOrJoinDMRoom(user: User, user2: User, server: Server, client: Socket) {
    const roomName = this.generateDMRoomName(user.id, user2.id)
    let room = await this.roomService.getRoom(roomName)
    if (this.userService.isAlreadyBlocked(user, user2) || this.userService.isAlreadyBlocked(user2, user)){
      server.to(`user-${user.id}`).emit("userBlocked", 
        'you cannot send or receive direct message from someone you have blocked or have been blocked by')
      return
    }
    if (!room) {
      room = await this.roomService.createDM(user, user2, roomName)
    }
    if (room.users?.length === 2){
      server.to(`user-${user.id}`).to(`user-${user2.id}`).emit("dmRoom", room)
    }
}

  generateDMRoomName(user1Id: string, user2Id: string): string {
      return user1Id < user2Id ? `${user1Id}-${user2Id}` : `${user2Id}-${user1Id}`
  }
  
  @SubscribeMessage('invitePrivateChannel')
  async invitePrivateChannel(@MessageBody() data: {roomId: number, guestUsername: string }, @ConnectedSocket() client: Socket){
    if (!data || typeof data.roomId !== "number" || typeof data.guestUsername !== "string"){
      Logger.error("Wrong type for parameter")
      return 
    }
    let hostId = client.handshake.query?.userId as string
    try{
      const info = await this.roomService.getInfoForInvite(data.roomId, data.guestUsername)
      if (hostId === info.target?.id){
        this.server.to(`user-${hostId}`).emit('inviteError', 'You cannot invite yourself')
        return
      }
      if (info.room?.privChan === false){
        Logger.error('You cannot invite in a public channel')
        return
      }
      const host = await this.userService.findOneById(hostId)
      const isInRoom = await this.roomService.isInRoom(info.target, info.room.id)
      if (isInRoom === true){
        this.server.to(`user-${hostId}`).emit('inviteError', `${info.target.username} is already in this channel`)
        return
      }
      if ((this.roomService.isAdmin(info.room, host) === 'isOwner' || 
          this.roomService.isAdmin(info.room, host) === 'isAdmin')){
        this.server.to(`user-${hostId}`).emit('chanInvite', data.guestUsername)
        this.server.to(`user-${info.target?.id}`).emit('chanInvitedNotification', 
        {
          senderId: host?.id, 
          senderUsername: host?.username, 
          roomName: info?.room?.name,
          roomId: data.roomId,
          targetId: info?.target?.id
        })
      }
      else{
        this.server.to(`user-${hostId}`).emit('inviteError', `suspect activities detected`)
        return 
      }
    }
    catch(err){
      this.server.to(`user-${hostId}`).emit('inviteError', err.response?.message)
      Logger.error(err)
    }
  }

  @SubscribeMessage('acceptedInviteChan')
  async acceptedInviteChan(@MessageBody() data: {roomId: number, roomName: string, targetId: string}, @ConnectedSocket() client: Socket){
    if (!data || typeof data.roomId !== "number" || typeof data.targetId !== "string" || typeof data.roomName !== "string"){
      Logger.error("Wrong type for parameter")
      return 
    }
    try{
      await this.roomService.addTargetInWhiteList(data.roomId, data.targetId)
      this.server.to(`user-${data.targetId}`).emit('signalForJoinRoom', data.roomName)
    }
    catch(err){
      Logger.error(err)
    }
  }
  
  @SubscribeMessage('declinedInviteChan')
  async declinedInviteChan(@MessageBody() data: {roomName: string, targetId: string, senderId: string }, @ConnectedSocket() client: Socket){
    if (!data || typeof data.roomName !== "string" || typeof data.targetId !== "string"){
      Logger.error("Wrong type for parameter")
      return 
    }
    try{
      const target = await this.userService.findOneById(data?.targetId)
      this.server.to(`user-${data.senderId}`).emit('declinedNotification', target?.username)
    }
    catch(err){
      Logger.error(err)
    }
  }

  @SubscribeMessage('friendRequestSended')
  async friendRequestSended(@MessageBody() data: {creatorId: string}, @ConnectedSocket() client: Socket) {
    if (!data || typeof data.creatorId !== 'string')
      return
    this.server.to('user-' + data.creatorId).emit('friendRequestSendedModal', data)
    this.server.to('user-' + data.creatorId).emit('friendRequestSendedChat')

  }


  @SubscribeMessage('friendRequestAccepted')
  async friendRequestAccepted(@MessageBody() data: {creatorId: string}, @ConnectedSocket() client: Socket) {
    if (!data || typeof data.creatorId !== 'string')
      return
    this.server.to('user-' + data.creatorId).emit('friendRequestAcceptedModal', data)
    this.server.to('user-' + data.creatorId).emit('friendRequestAcceptedChat')
  }

  @SubscribeMessage('friendRemoved')
  async friendRemoved(@MessageBody() data: {creatorId: string}, @ConnectedSocket() client: Socket) {
    if (!data || typeof data.creatorId !== 'string')
      return
    this.server.to('user-' + data.creatorId).emit('friendRemovedModal', data)
    this.server.to('user-' + data.creatorId).emit('friendRemovedChat')
  }

  @SubscribeMessage('channelCreation')
  event(@ConnectedSocket() client: Socket) {

    this.server.sockets.emit('channelCreated');
  }
  
  @SubscribeMessage('channelRightsUpdate')
  channelRightsUpdate(@MessageBody() data : {roomId : number} , @ConnectedSocket() client : Socket) {

    if (!data || typeof data.roomId !== 'number')
    {
      Logger.error('wrong data passed to channelRightsUpdate event');
      return ;
    }
    this.server.to(`room-${data.roomId}`).emit('channelUpdate', data.roomId);
  }

  @SubscribeMessage('userGotBannedOrMuted')
  userGotBannedOrMuted(@MessageBody() data : {roomId : number, timeInMinutes : number}) {
    if (!data || typeof data?.roomId !== 'number' 
    || typeof data.timeInMinutes !== 'number' || data.timeInMinutes > 120 || data.timeInMinutes <= 0)
    {
      Logger.error('wrong data passed to userGotBannedOrMuted event');
      return ;
    }
    this.server.to(`room-${data.roomId}`).emit('channelUpdate', data.roomId);

    setTimeout(() => {

      this.server.to(`room-${data.roomId}`).emit('timeoutEnd', data.roomId);
    }, data.timeInMinutes * 60 * 1000 + 2000)
  }

  @SubscribeMessage('userGotBanned')
  userGotBanned(@MessageBody() data : {targetId : string, roomName : string} , @ConnectedSocket() client : Socket) {

    if (!data || typeof data.targetId !== 'string' || typeof data.roomName !== 'string')
    {
      Logger.error('wrong data passed to userGotBanned event');
      return ;
    }
    this.server.to(`user-${data.targetId}`).emit('youGotBanned', data.roomName);
    this.server.to(`user-${data.targetId}`).emit('expeledFromChan', data.roomName);
  }

  @SubscribeMessage('channelStatusUpdate')
  channelStatusUpdate(@ConnectedSocket() client : Socket) {
    
    this.server.sockets.emit('channelStatusUpdate');
  }
}