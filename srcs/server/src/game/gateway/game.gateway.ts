import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/services/auth.service';
import { UsersService } from 'src/users/services/users.service';
import {
  GameInfo,
  GameState,
} from '../globals/interfaces';
import { GamePlayService } from '../services/gameplay.services';
import { MatchmakingService } from '../services/match-making-services';

@WebSocketGateway( {cors: {
    origin : '*'
  },
} )
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {

  gamesMap : Map<string, GameState> = new Map();
  
  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly gamePlayService : GamePlayService,
    private readonly userService : UsersService,
    private readonly authService : AuthService
  ) {}
  
  @WebSocketServer()
  server : Server;

 async handleConnection(client: Socket) {

   try {
     if (client.handshake.query?.userId === undefined)
     {
        Logger.error(client.id + 'was disconnected, incomplete query parameters')
        client.disconnect();
        return ;
     }
     const payload = await this.authService.validateAccessJwt(client.handshake.query?.token as string);
      if (client.handshake.query.type !== 'game')
        return;

      const user = await this.userService.findOneById(client.handshake.query?.userId as string);

      if (this.server.sockets.adapter.rooms.has('game-' + user.id) === false)
        this.userService.update(user.id, {isLogged : true, isAvailable : true})
      this.server.sockets.emit('userListUpdate');
      this.server.sockets.emit('friendListUpdate');
      client.join('game-' + user.id);
    }
    catch(e) {
      client.disconnect();
      Logger.error('game gateway handle connection error : ', e)
    }
    Logger.log(client.id + 'connected succefully in gameGateway')
  }
  
  async handleDisconnect(client: Socket){

    try {
      const user = await this.userService.findOneById(client.handshake.query?.userId as string);
      if (client.handshake.query.type !== 'game')
        return ;
      
      this.gamesMap.forEach((game, key) => {
        if (game.clientOne && game.clientOne.socket.id === client.id)
        {
          this.matchmakingService.leaveGame(this.server, client, this.gamesMap, {gameType : game.gameType, playerId : '1', roomName : key});
          this.userService.update(user.id, {isAvailable : true});
        }
        else if (game.clientTwo && game.clientTwo.socket?.id === client.id)
        {
          this.matchmakingService.leaveGame(this.server, client, this.gamesMap, {gameType : game.gameType, playerId : '2', roomName : key});
          this.userService.update(user.id, {isAvailable : true});
        }
      });
      client.leave('game-' + user.id);
      if (this.server.sockets.adapter.rooms.has('game-' + user.id) === false)
        this.userService.update(user.id, {isAvailable : false, isLogged : false})
      this.server.sockets.emit('userListUpdate');
      this.server.sockets.emit('friendListUpdate');
    }
    catch(e) {
      Logger.error('Game Gateway handle disconnection error: ', e?.message);
    }
    Logger.log(client.id + 'was disconnected')
  }

  @SubscribeMessage('registered') 
  registered() {

    this.server.sockets.emit('userListUpdate');
  }

  @SubscribeMessage('joinGame')
  joinGame(@MessageBody() data : {gameType : string},@ConnectedSocket() client: Socket) {

    if (typeof data?.gameType !== 'string')
    {
      Logger.error('type error in joinGame');
      return ;
    }

    this.matchmakingService.joinGame(this.server, client, client.handshake.query?.userId as string, this.gamesMap, data.gameType);
  }

  @SubscribeMessage('joinDuel')
  async joinDuel(@MessageBody() data : GameInfo, @ConnectedSocket() client : Socket){
    if (typeof data?.gameType !== 'string' || typeof data?.playerId !== 'string' || typeof data?.roomName !== 'string')
    {
      Logger.error('type error in joinDuel');
      return ;
    }

    this.matchmakingService.joinDuel(this.server, client, this.gamesMap, data);
  }

  @SubscribeMessage('leaveGame')
  leaveGame(@MessageBody() data : GameInfo, @ConnectedSocket() client: Socket) {

    if (data === null || data === undefined || typeof data?.gameType !== 'string' || typeof data?.playerId !== 'string' || typeof data?.roomName !== 'string')
    {
      Logger.error('type error in leaveGame');
      return ;
    }
     
    this.matchmakingService.leaveGame(this.server, client, this.gamesMap, data);
  }

  @SubscribeMessage('leaveQueue')
  leaveQueue(@MessageBody() data : {roomName : string}, @ConnectedSocket() client: Socket) {

    if (data === null || data === undefined || typeof data?.roomName !== 'string')
    {
      Logger.error('type error in leaveQueue');
      return ;
    }

    this.matchmakingService.leaveQueue(data, this.gamesMap, client, this.server);
  }

  @SubscribeMessage('playerMove')
  playerMove(@MessageBody() data: {key : string, playerId : string, room : string}, @ConnectedSocket() client: Socket) {
    
    if (typeof data?.key !== 'string' || typeof data?.playerId !== 'string' || typeof data?.room !== 'string' )
    {
      Logger.error('type error in playerMove')
      return ;
    }

    this.gamePlayService.movingStarted(this.gamesMap.get(data.room), data, client.id)
  }

  @SubscribeMessage('playerMoveStopped')
  playerMoveStopped(@MessageBody() data: {key : string, playerId : string, room : string}, @ConnectedSocket() client: Socket) {
    
    if (typeof data.key !== 'string' || typeof data.playerId !== 'string' || typeof data.room !== 'string' )
    {
      Logger.error('type error in playerMoveStopped')
      return ;
    }

    this.gamePlayService.movingStopped(this.gamesMap.get(data.room), data, client.id)
  }

  @SubscribeMessage('startGameLoop')
  async startGameLoop(@MessageBody() data : GameInfo, @ConnectedSocket() client: Socket) {
    
    if (data === undefined || data === null || 
    typeof data?.gameType !== 'string' || typeof data?.playerId !== 'string' || typeof data?.roomName !== 'string')
    {
      Logger.error('type error in startGameLoop')
      return ;
    }

    const game = this.gamesMap.get(data.roomName);
    if (game === undefined)
    {
      Logger.error('game undefined in startGameLoop')
      return ;
    }
    try {
      await this.gamePlayService.gameLoop(this.gamesMap.get(data.roomName), data, client, this.server);
    }
    catch(e) {
      Logger.error('starting game loop failure');
    }
  }

  @SubscribeMessage('availabilityChange')
  async availabilityChange(@MessageBody() bool : boolean, @ConnectedSocket() client: Socket) {
    
    if (typeof bool !== 'boolean')
    {
      Logger.error('type error in availibilityChange')
      return ;
    }

    try {
      const user = await this.userService.findOneById(client.handshake.query?.userId as string);
      if (bool === true) {
        this.userService.update(user.id, {isAvailable : bool});
      }
      this.matchmakingService.availabilityHandler(this.server, user.id, bool)
    }
    catch(e) {
      Logger.error('In availibilityChange : ', e?.message)
    }
  }

  @SubscribeMessage('logout')
  async logout(@ConnectedSocket() client: Socket) {
    
    this.availabilityChange(false, client);
    this.handleDisconnect(client);
    try {
      const user = await this.userService.findOneById(client.handshake.query?.userId as string);
      this.server.to('game-' + user.id).emit('logout', undefined);
    }
    catch(e) {
      Logger.error('In logout : ', e?.message)
    }
  }

  @SubscribeMessage('gameInvite')
  async gameInvite(@MessageBody() data : {targetId : string, gameType : string}, @ConnectedSocket() client : Socket) {

    if (data === undefined || data === null || typeof data.targetId != 'string' || typeof data.gameType != 'string')
    {
      Logger.error('type error in GameInvite : ')
      return ;
    }

    try {
      await this.matchmakingService.gameInvite(this.server, client.id,
      client.handshake.query.userId as string, data.targetId, data.gameType);
    }
    catch(e) {
      Logger.error('in gameInvite : ', e?.message);
    }
  }

  @SubscribeMessage('acceptedInvite')
  async acceptedInvite(@MessageBody() data : {senderSocketId : string, senderId : string, gameType : string}, @ConnectedSocket() client : Socket) {
    
    if (data === undefined || data === null || typeof data.senderSocketId != 'string' || typeof data.senderId != 'string' || typeof data.gameType != 'string')
    {
      Logger.error('type error in acceptedInvite : ')
      return ;
    }

    try {
      await this.matchmakingService.inviteWasAccepted(this.server, data.senderSocketId, client.id,
        data.senderId, client.handshake.query.userId as string, data.gameType)
    }
    catch (e) {
      Logger.error('in accepted invite : ', e?.message);
    }
  }

  @SubscribeMessage('declinedInvite')
  async declinedInvite(@MessageBody() data : {senderId : string}, @ConnectedSocket() client : Socket) {
    if (data === undefined || data === null || typeof data.senderId != 'string')
    {
      Logger.error('type error in declinedInvite : ')
      return ;
    }
    try {
      await this.matchmakingService.inviteWasDeclined(this.server, data.senderId, client.handshake.query.userId as string)
    }
    catch(e) {
      Logger.error('in declined invite : ', e?.message);
    }
  }

  @SubscribeMessage('closeOpenedModals')
  closeOpenedModals(@ConnectedSocket() client : Socket) {
    client.emit('closeModal');
  }
}

