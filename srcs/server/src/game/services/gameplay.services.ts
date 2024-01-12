import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/services/users.service';
import * as Constants from '../globals/const';
import {
  GameInfo,
  GameMetrics,
  GameState,
} from '../globals/interfaces';
import {
  ballRelaunch,
  ballReset,
  goal,
  willBallCollideWithWall,
  willBallOverlapPaddleOne,
  willBallOverlapPaddleTwo
} from './BallMoves';

@Injectable()
export class GamePlayService {

  constructor(

    private readonly usersService : UsersService
) {}

  // ********************************* PADDLE ********************************* //


  async movingStarted(game : GameState, data: {key : string, playerId : string, room : string}, clientId : string) {

    if (game === undefined)
      return ;

    if (data.playerId === '1' && clientId !== game.clientOne.socket.id)
      return ;
    else if (data.playerId === '2' && clientId !== game.clientTwo.socket.id)
      return ;

    switch (data.key.toLowerCase())
    {
      case Constants.RIGHT :
        data.playerId === '1' ?  game.paddleOne.movingRight = true : game.paddleTwo.movingRight = true;
        break ;
      case Constants.LEFT :
        data.playerId === '1' ? game.paddleOne.movingLeft = true : game.paddleTwo.movingLeft = true;
        break ;
      default :
        break;
    }
  }

  async movingStopped(game : GameState, data: {key : string, playerId : string, room : string}, clientId : string) {

    if (game === undefined)
      return ;

    if (data.playerId === '1' && clientId !== game.clientOne.socket.id)
      return ;
    else if (data.playerId === '2' && clientId !== game.clientTwo.socket.id)
      return ;

    switch (data.key.toLowerCase())
    {
      case Constants.RIGHT :
        data.playerId === '1' ?  game.paddleOne.movingRight = false : game.paddleTwo.movingRight = false;
        break ;
      case Constants.LEFT :
        data.playerId === '1' ? game.paddleOne.movingLeft = false : game.paddleTwo.movingLeft = false;
        break ;
      default :
        break;
    }
  }

  handlePaddleMovement(game : GameState) {
    
    if (game === undefined)
      return ;

    const distancePerFrame = Constants.PADDLE_SPEED;

    if (game.paddleOne.movingLeft === true)
      game.paddleOne.x -= distancePerFrame;

    else if (game.paddleOne.movingRight === true)
      game.paddleOne.x += distancePerFrame;

    game.paddleOne.x >= 1 - game.paddleOne.width ? game.paddleOne.x = 1 - game.paddleOne.width : game.paddleOne.x;
    game.paddleOne.x <= 0 ? game.paddleOne.x = 0 : game.paddleOne.x;

    if (game.paddleTwo.movingLeft === true)
      game.paddleTwo.x -= distancePerFrame;

    else if (game.paddleTwo.movingRight === true)
      game.paddleTwo.x += distancePerFrame;

    game.paddleTwo.x >= 1 - game.paddleTwo.width ? game.paddleTwo.x = 1 - game.paddleTwo.width : game.paddleTwo.x;
    game.paddleTwo.x <= 0 ? game.paddleTwo.x = 0 : game.paddleTwo.x;
  }

  // ********************************* BALL ********************************* //

  handleBallMovement(game : GameState, data: GameInfo, client : Socket, server : Server) {
    
    if (game === undefined)
      return ('gameOver');

    if (goal(server, game,data.roomName, game.ball))
    {
      if (game.clientOneScore >= Constants.SCORE_TO_REACH)
      {
        game.winner = game.clientOne.id;
        game.looser = game.clientTwo.id;
        return ('gameOver')
      }
      else if (game.clientTwoScore >= Constants.SCORE_TO_REACH)
      {
        game.winner = game.clientTwo.id;
        game.looser = game.clientOne.id;
        return ('gameOver')
      }
      ballReset(game.ball);
      return ('goal')
    }
    
    let vX = game.ball.speed * Math.cos(game.ball.angle);
    let vY = game.ball.speed * Math.sin(game.ball.angle)
    
    if (willBallOverlapPaddleOne(game.ball, game.paddleOne, vX, vY, game.gameType) === false &&
    willBallOverlapPaddleTwo(game.ball, game.paddleTwo, vX, vY, game.gameType) === false &&
    willBallCollideWithWall(game.ball, vX) === false)
    {
      game.ball.x += vX;
      game.ball.y += vY;
    }
    else 
    {
      if (game.ball.speed < Constants.BALL_SPEED * 2)
        game.ball.speed += Constants.BALL_SPEED_INCREMENT;
    }
  }

  /**
 * @description 
 * pause the game after a point and relaunch the ball
 *  | need server and roomName to send ball pos to front
*/
  pauseBetweenPoints(game : GameState, server : Server, roomName : string) {

    let ct = 3;
    const int = setInterval(() =>{
        server.to(roomName).emit('midPointCt', ct);
        if (ct === -1)
        {
            clearInterval(int)
            ballRelaunch(game?.ball)
            
            server.to(roomName).emit('midPointCtEnd');
            return ;
        }
        ct --
    }, 1000);
  }

  async getUserBasicInfos(id : string) {
    try {
      const res = await this.usersService.findOneById(id);
      return ({id : id, username : res.username});    
    }
    catch (e) {
      Logger.error('user not found in getUserBasicInfos : ', e?.message)
    } 
  }
  
  async gameLoop(game : GameState, data: GameInfo, client : Socket, server : Server) {
    
    let ballEvents : string = 'start';
    try {

      const userOneInfos = await this.getUserBasicInfos(game.clientOne.id);
      const userTwoInfos = await this.getUserBasicInfos(game.clientTwo.id);

      
      server.to(data.roomName).emit('gameStarted', userOneInfos, userTwoInfos);
      if (game.hasStarted === false)
        game.hasStarted = true;
      else
        return ;
      
      game.ballRefreshInterval = setInterval(() => {
        
          if (server.sockets.adapter.rooms.get(data.roomName).size === 1)
          {
            const winner = server.sockets.adapter.rooms.get(data.roomName).values().next().value === game.clientOne.socket.id ? game.clientOne.id : game.clientTwo.id;
            
            game.looser = winner === game.clientOne.id ? game.clientTwo.id : game.clientOne.id;
            game.winner = winner;
            server.to(data.roomName).emit('gameOver', {winner : winner});
            return (clearInterval(game.ballRefreshInterval))
          }
          ballEvents = this.handleBallMovement(game, data, client, server);
            
          this.handlePaddleMovement(game);
  
          if (game.isPaused === true)
          {
            game.isPaused = false;
            ballReset(game.ball);
            this.pauseBetweenPoints(game, server, data.roomName);
          }
          else if (ballEvents === 'goal')
          {
            this.pauseBetweenPoints(game, server, data.roomName);
          }
          else if (ballEvents === 'gameOver')
          {
            server.to(data.roomName).emit('gameOver', {winner : game.winner});
            return (clearInterval(game.ballRefreshInterval))
          }
          else
          {
            let playerOneMetrics : GameMetrics = {paddleOne : game.paddleOne, paddleTwo : game.paddleTwo, ball : game.ball};
            let PlayerTwoMetrics : GameMetrics = {paddleOne : game.paddleTwo, paddleTwo : game.paddleOne, ball : game.ball};
            server.to(data.roomName).emit('gameMetrics', playerOneMetrics, PlayerTwoMetrics);
          }
        }, Constants.FRAME_RATE);
    }
    catch (e) {
      Logger.error('a game loop could not start, basic infos were not retrievables :', e?.message)
    }
  }
}
