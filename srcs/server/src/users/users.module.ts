import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/services/auth.service';
import { Game } from 'src/game/entities/game-entity';
import { MatchHistoryService } from 'src/game/services/match.history.services';
import { UsersController } from './controllers/users.controller';
import {
  Avatar
} from './entities/avatar.entity';
import { FriendRequest } from './entities/friendRequest.entity';
import { User } from './entities/user.entity';
import { AvatarService } from './services/avatar.service';
import { UsersService } from './services/users.service';
@Module({
  imports: [TypeOrmModule.forFeature([User, FriendRequest]), TypeOrmModule.forFeature([Avatar]), TypeOrmModule.forFeature([Game])],
  controllers: [UsersController],
  providers: [UsersService, AuthService, JwtService, AvatarService, MatchHistoryService],
  exports: [UsersService]
})
export class UsersModule {}
