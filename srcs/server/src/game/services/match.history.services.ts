import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from 'src/users/services/users.service';
import { Repository } from 'typeorm';
import { CreateGameDto } from '../dto/create.game.dto';
import { Game } from '../entities/game-entity';
import { GameState } from '../globals/interfaces';
import { Server } from 'socket.io';


@Injectable()
export class MatchHistoryService {

    constructor(
        @InjectRepository(Game)
        private gameRepository: Repository<Game>,
        private readonly usersService : UsersService
    ) {}

    async storeGameResults(game : GameState, server : Server): Promise<Game> {
            const winner = await this.usersService.findOneById(game.winner)
            const looser = await this.usersService.findOneById(game.looser)
    
            if (!winner || !looser)
                throw new NotFoundException("User not found", 
                {
                    cause: new Error(), 
                    description: "cannot find user in database"
                });
    
            const createDto : CreateGameDto = {
                winnerId : game.winner,
                winnerUsername : winner.username,
                winnerScore : game.winner === game.clientOne.id ? game.clientOneScore : game.clientTwoScore,
                looserId : game.looser,
                looserUsername : looser.username,
                looserScore: game.looser === game.clientOne.id ? game.clientOneScore : game.clientTwoScore,
            }
            
            let newGame = this.gameRepository.create(createDto);
            if (!newGame)
                throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'Cannot create game'});
    
            newGame = await this.gameRepository.save(newGame);
            if (!newGame)
                throw new InternalServerErrorException('Database error', {cause: new Error(), description: 'Cannot create game'});
                
            await this.addGameToUsersPlayedGames(newGame);
            server.to('game-' + winner.id).to('game-' + looser.id).emit('updateHistory')
            server.sockets.emit('leaderBoardUpdate');
            return (newGame);
    }

    async addGameToUsersPlayedGames(game : Game) {
        
        try {
            await this.addGameToLooserPlayedGames(game);
            await this.addGameToWinnerPlayedGames(game);
        }
        catch(e) {
            Logger.error('failed to add game to user history : ', e?.message);
        }
    }
    
    async addGameToWinnerPlayedGames(game : Game) {

        const winner = await this.usersService.findOneWitOptions({relations : {playedGames: true},where: {id : game.winnerId }})
        if (!winner)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            });
        
        if (winner.playedGames === undefined)
            winner.playedGames = [];
            
        winner.playedGames.push(game);
        winner.winsAmount ++;

        return await this.usersService.save(winner);

    }

    async addGameToLooserPlayedGames(game : Game)
    {
        
        const looser = await this.usersService.findOneWitOptions({relations : {playedGames: true},where: {id : game.looserId }})
        if (!looser)
            throw new NotFoundException("Room not found", 
            {
                cause: new Error(), 
                description: "cannot find this room in database"
            });
        
        if (looser.playedGames === undefined)
            looser.playedGames = [];
        looser.playedGames.push(game);
        looser.loosesAmount ++;

        return await this.usersService.save(looser);

    }


  async returnHistory(userId : string){

      const user = await this.usersService.findOneWitOptions({relations : {playedGames: true},where: {id : userId}})
      if (!user)
        throw new NotFoundException("Room not found", 
        {
            cause: new Error(), 
            description: "cannot find this room in database"
        });

      return (user.playedGames.reverse());
    }
}