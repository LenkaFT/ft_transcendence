import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { IsInt, IsPositive, IsUUID, Max, validate } from 'class-validator';

class userIdDto {
    @IsUUID()
    userId: string
}

class roomIdDto {
  @IsInt()
  @IsPositive()
  @Max(1000000)
  roomId: number
}

class friendRequestIdDto {
  @IsInt()
  @IsPositive()
  @Max(1000000)
  requestId: number
}

export const UUIDParam = createParamDecorator(
  async (id: string, ctx: ExecutionContext) => {
    const [request] = ctx.getArgs();
    const { params } = request;

    const userId = params.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const errors = await validate(plainToClass(userIdDto, { userId }));
    if (errors.length > 0) {
      throw new BadRequestException('Invalid UUID');
    }

    return userId;
  },
);

export const INTParam = createParamDecorator(
  async (id: number, ctx: ExecutionContext) => {
    const [request] = ctx.getArgs();
    const { params } = request;

    const roomId = Number(params.id);

    if (!roomId) {
      throw new BadRequestException('User ID is required');
    }

    const errors = await validate(plainToClass(roomIdDto, { roomId }));
    if (errors.length > 0) {
      throw new BadRequestException('Invalid UUID');
    }

    return roomId;
  },
);

export const FRIDParam = createParamDecorator(
  async (friendRequestId: number, ctx: ExecutionContext) => {
    const [request] = ctx.getArgs();
    const { params } = request;

    const requestId = Number(params.friendRequestId);

    if (!requestId) {
      throw new BadRequestException('friend request ID is required');
    }

    const errors = await validate(plainToClass(friendRequestIdDto, { requestId }));
    if (errors.length > 0) {
      throw new BadRequestException('Invalid friend request id');
    }

    return requestId;
  },
);

export const FRuserIdParam = createParamDecorator(
  async (receiverId: string, ctx: ExecutionContext) => {
    const [request] = ctx.getArgs();
    const { params } = request;

    const userId = params.receiverId;


    if (!userId) {
      throw new BadRequestException('receiver ID is required');
    }

    const errors = await validate(plainToClass(userIdDto, { userId }));
    if (errors.length > 0) {
      throw new BadRequestException('Invalid user id');
    }

    return userId;
  },
);