import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AccessToken2FAGuard } from 'src/auth/guards/accessToken2FA.auth.guard';
import { FRIDParam, FRuserIdParam, UUIDParam } from 'src/decorator/decorator';
import { leaderboardStats } from 'src/game/globals/interfaces';
import { MatchHistoryService } from 'src/game/services/match.history.services';
import { GetUser } from '../decorator/user.decorator';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UsersService } from '../services/users.service';
import { ThrottlerGuard } from '@nestjs/throttler';
@Controller('users')
@UseGuards(ThrottlerGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly matchHistoryService: MatchHistoryService,
    ) {}

    
  @UseGuards(AccessToken2FAGuard)
  @Get()
  findAll(@GetUser() user: User) {
    return this.usersService.findAllUsers(user);
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('scoreList')
  scoreList(): Promise<leaderboardStats[]> {
    return (this.usersService.returnScoreList());
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('history/:id')
  history(@Param('id') @UUIDParam() userId: string) {
    return (this.matchHistoryService.returnHistory(userId));
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('profile/:id')
  profile(@Param('id') @UUIDParam() userId: string) {
    return (this.usersService.returnProfile(userId));
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('isAvailable')
  isAvailable(@GetUser() user : User) {
    return (user.isAvailable);
  }

  @UseGuards(AccessToken2FAGuard)
  @Patch('updateIsAvailable')
  updateIsAvailable(@GetUser() user : User, @Body() updateDto : UpdateUserDto) {
    return (this.usersService.update(user.id, updateDto));
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('avatar/:id')
  getUserAvatar(@Res({passthrough: true}) res: Request, @Param('id') @UUIDParam() id: string) {
    return this.usersService.getUserAvatar(res, id)
  }

  @UseGuards(AccessToken2FAGuard)
  @Patch()
  update(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto){
    return this.usersService.update(user.id, updateUserDto);
  }

  @UseGuards(AccessToken2FAGuard)
  @Post('block/:id')
  blockTarget(@GetUser() user: User, @Param('id') @UUIDParam() targetId: string){
    return this.usersService.blockTarget(user.id, targetId)
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('isBlocked/:id')
  isBlocked(@GetUser() user: User, @Param('id') @UUIDParam() targetId: string){

    return this.usersService.isBlocked(user, targetId);
  }

  @UseGuards(AccessToken2FAGuard)
  @Delete(':id')
  remove(@Param('id') @UUIDParam() userId: string) {
    return this.usersService.remove(userId);
  }

  @Get(':id')
  async findOne(@Param('id') @UUIDParam() id: string) {
    const user = await this.usersService.findOneById(id)
    if (!user)
      throw new NotFoundException("Users not found", 
      {cause: new Error(), description: "cannot find any users in database"})
    return this.usersService.removeProtectedProperties(user)
  } 

  // ==================================================================== //
  // ======================== FRIENDS REQUEST =========================== //
  // ==================================================================== /

  @UseGuards(AccessToken2FAGuard)
  @Post('friendRequest/send/:receiverId')
  sendFriendRequest(@Param('receiverId') @FRuserIdParam() receiverId: string, @GetUser() user: User, @Res() res:any) {
    return this.usersService.sendFriendRequest(receiverId, user, res)
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('friendRequest/:receiverId')
  getFriendRequest(@Param('receiverId') @FRuserIdParam() receiverId: string, @GetUser() user: User, @Res() res:any) {
    return this.usersService.getFriendRequest(receiverId, user, res)
  }

  @UseGuards(AccessToken2FAGuard)
  @Patch('friendRequest/response/:friendRequestId')
  respondToFriendRequest(@Param('friendRequestId') @FRIDParam() friendRequestId: number, @Body() body: any, @Res() res: Request) {
    return this.usersService.respondToFriendRequest(friendRequestId, body.status, res)
  }

  @UseGuards(AccessToken2FAGuard)
  @Patch('friendRequest/remove/:friendRequestId')
  removeFriend(@Param('friendRequestId') @FRIDParam() friendRequestId: number,  @Res() res: Request) {
    return this.usersService.removeFriend(friendRequestId, res)
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('friendRequest/me/received')
  getFriendRequestsFromRecipients(@GetUser() user: User, @Res() res:any) {
    return this.usersService.getFriendRequestFromRecipients(user, res)
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('friends/all')
  getFriends(@GetUser() user: User, @Res() res:any) {
    return this.usersService.getFriends(user, res)
  }

  @UseGuards(AccessToken2FAGuard)
  @Get('friends/allRequests')
  getAllRequests(@GetUser() user: User, @Res() res:any) {
    
    return this.usersService.getRequests(user, res)
  }
}
