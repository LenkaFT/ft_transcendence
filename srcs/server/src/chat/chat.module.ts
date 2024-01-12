import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from "src/auth/auth.module";
import { AuthService } from "src/auth/services/auth.service";
import { Avatar } from "src/users/entities/avatar.entity";
import { FriendRequest } from "src/users/entities/friendRequest.entity";
import { User } from "src/users/entities/user.entity";
import { AvatarService } from "src/users/services/avatar.service";
import { UsersService } from "src/users/services/users.service";
import { ChatGateway } from "./gateway/chat.gateway";
import { MessageController } from "./controllers/message.controller";
import { RoomController } from "./controllers/room.controller";
import { Message } from "./entities/message.entity";
import { Room } from "./entities/room.entity";
import { MessageService } from "./services/message.service";
import { RoomService } from "./services/room.service";
@Module({
    imports: [TypeOrmModule.forFeature([Room]), TypeOrmModule.forFeature([Message]), AuthModule, JwtModule, TypeOrmModule.forFeature([User, FriendRequest]), TypeOrmModule.forFeature([Avatar])] ,
    controllers: [RoomController, MessageController],
    providers: [ChatGateway, RoomService, MessageService, JwtService, UsersService, AuthService, AvatarService],
    exports: [RoomService, MessageService, ChatGateway]
    //Export roomService si besoin est
})
export class ChatModule {}