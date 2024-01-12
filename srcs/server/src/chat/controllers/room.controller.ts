import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AccessToken2FAGuard } from 'src/auth/guards/accessToken2FA.auth.guard';
import { AuthService } from 'src/auth/services/auth.service';
import { INTParam } from 'src/decorator/decorator';
import { GetUser } from 'src/users/decorator/user.decorator';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/services/users.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { CreateRoomDto } from '../dto/create-room.dto';
import { JoinRoomDto } from '../dto/join-room.dto';
import { UpdatePrivilegesDto } from '../dto/update-privileges.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { RoomService } from '../services/room.service';

@UseGuards(AccessToken2FAGuard)
@UseGuards(ThrottlerGuard)
@Controller('room')
export class RoomController {
    constructor(
        private readonly roomService: RoomService,
        private readonly authService: AuthService,
        private readonly userService: UsersService
    ){}

    @Post()
    createRoom(@GetUser() user: User, @Body() createRoomDto: CreateRoomDto){
        return this.roomService.create(createRoomDto, user)
    }

    @Get('list')
    getRoomListWithoutDm(){
        return this.roomService.findAllWithoutDm();
    }

    @Get('userlist/:id')
    getUserList(@Param("id") @INTParam() id: number){
        return this.roomService.findAllUsersInRoom(id)
    }

    @Get('bannedList/:id')
    getBanList(@Param("id") @INTParam() id: number) {
        return  this.roomService.getBanList(id)
    }

    @Get('isPriv/:id')
    isPriv(@Param("id") @INTParam() id: number) {
        return  this.roomService.isPriv(id)
    }

    @Get('isInRoom/:id')
    isInRoom(@GetUser() user : User ,@Param("id") @INTParam() id: number) {
        return  this.roomService.isInRoom(user ,id)
    }

    @Get('messageInRoom/:id')
    messageInRoom(@GetUser() user: User, @Param("id") @INTParam() id: number) {
        return  this.roomService.messageInRoom(id, user?.id)
    }

    @Post('joinRoom')
    joinRoom(@GetUser() user: User, @Body() dto: JoinRoomDto){
        return this.roomService.joinRoom(dto, user);
    }

    @Post('message')
    postMessage(@GetUser() user: User, @Body() dto: CreateMessageDto){
        return this.roomService.postMessage(user, dto)
    }

    @Post('giveAdminPrivileges')
    giveAdminPrivileges(@GetUser() user: User, @Body() updatePrivilegesDto : UpdatePrivilegesDto){
        return  this.roomService.giveAdminPrivileges(user, updatePrivilegesDto)

    }

    @Post('removeAdminPrivileges')
    removeAdminPrivileges(@GetUser() user: User, @Body() updatePrivilegesDto : UpdatePrivilegesDto){
        return  this.roomService.removeAdminPrivileges(user, updatePrivilegesDto)
    }

    @Post('userPrivileges')
    hasAdminPrivileges(@Body() updatePrivilegesDto : UpdatePrivilegesDto){
        return  this.roomService.userPrivileges(updatePrivilegesDto)
    }

    @Post('muteUser')
    muteUser(@GetUser() user : User, @Body() updatePrivilegesDto : UpdatePrivilegesDto) {
        return  this.roomService.muteUser(user, updatePrivilegesDto, updatePrivilegesDto.timeInMinutes)
    }

    @Post('banUser')
    banUser(@GetUser() user : User, @Body() updatePrivilegesDto : UpdatePrivilegesDto) {
        return  this.roomService.banUser(user, updatePrivilegesDto)
    }

    @Post('unbanUser')
    unbanUser(@GetUser() user : User, @Body() updatePrivilegesDto : UpdatePrivilegesDto) {
        return  this.roomService.unbanUser(user, updatePrivilegesDto)
    }

    @Post('unmuteUser')
    unmuteUser(@GetUser() user : User, @Body() updatePrivilegesDto : UpdatePrivilegesDto) {
        return  this.roomService.unmuteUser(user, updatePrivilegesDto)
    }
    

    @Post('setPassword')
    setPassword(@GetUser() user: User, @Body() updateRoomDto: UpdateRoomDto){
        return this.roomService.setPassword(user, updateRoomDto)
    }
    

    @Post('changePassword')
    changePassword(@GetUser() user: User, @Body() updateRoomDto: UpdateRoomDto){
        return this.roomService.changePassword(user, updateRoomDto)
    }
    

    @Post('removePassword')
    removePassword(@GetUser() user: User, @Body() updateRoomDto: UpdateRoomDto){
        return this.roomService.removePassword(user, updateRoomDto)
    }

}
