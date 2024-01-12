import { Server } from 'socket.io';
import * as Constants from '../globals/const';
import {
    Ball,
    GameState,
    Paddle,
} from '../globals/interfaces';


/**
 * @description 
 * randomize ball.angle and avoid angle to be to close to 180 and 0
*/
export function randomizeBallAngle() {
      
    let angle = 0
    while (angle < Math.PI * 0.25 
      || angle > Math.PI * 0.75 && angle < Math.PI * 1.25 
      || angle > Math.PI * 1.75)
      {
        angle = Math.floor(Math.random() * 360) * (Math.PI / 180);;
      }
    return (angle)
  }
/**
 * @description 
 * randomize ball.angle and set ball.speed for a new round
*/
export function ballRelaunch(ball : Ball) {
    ball.angle = randomizeBallAngle();
    ball.speed =  Constants.BALL_SPEED;
}

/**
 * @description 
 * set ball position at the center of the board
*/
export function ballReset(ball : Ball) {
    ball.x = 0.5;
    ball.y = 0.5;
    ball.angle = 0;
    ball.speed = 0;
}

/**
 * @description 
 * check if the ball as reached a goal zone
*/
export function goal (server : Server, game : GameState,roomName : string,ball : Ball) {
    if (ball.y + ball.size >= 1)
    {
        game.clientTwoScore ++;
        server.to(roomName).emit('pointScored', 2, game.clientTwoScore);
        return (true)
    }
    else if (ball.y - ball.size <= 0)
    {
        game.clientOneScore ++;
        server.to(roomName).emit('pointScored', 1, game.clientOneScore);
        return (true);
    }
    else
        return (false)
}
/**
 * @description 
 * change ball direction angle following a collision with a verticl surface
*/
export function VerticalCollisionAngle(ball : Ball) {

    // 1/4 of trig circle
    if (ball.angle <= 0.5 * Math.PI)
        ball.angle += Math.PI * 0.5;
    
    // 2/4 of trig circle
    else if (ball.angle <= Math.PI)
        ball.angle -= Math.PI * 0.5;
    
    // 3/4 of trig circle
    else if (ball.angle <= 1.5 * Math.PI)
        ball.angle += Math.PI * 0.5;
    
    // 4/4 of trig circle
    else if (ball.angle <= 2 * Math.PI)
        ball.angle -= Math.PI * 0.5;
}

/**
 * @description 
 * change ball direction angle following a collision with a horizontal paddle
*/
export function HorizontalCollisionsAngle(ball : Ball, paddle : Paddle) {

    const distanceToPaddleCenter = Math.abs(ball.x - (paddle.x + paddle.width / 2))

    // the closer to the Paddle center the closer bounce direction will be to 0 and
    // the farther, the closer bounce direction will be to Math.PI * 0.5

    let bounceDirection = Math.PI * 0.5 * ((distanceToPaddleCenter / ( paddle.width / 2)));

    // following condition keep the ball to go in a 90 degree angle (therefor provoking an hard lock)
    if (bounceDirection > Math.PI * 0.5 * 0.95)
        bounceDirection = 0.95 * Math.PI * 0.5;

    // 1/4 of trig circle
    if (ball.angle <= 0.5 * Math.PI)
        ball.angle = 1.5 * Math.PI + bounceDirection; 

    // 2/4 of trig circle
    else if (ball.angle <= Math.PI)
        ball.angle = 1.5 * Math.PI - bounceDirection;
        
    // 3/4 of trig circle
    else if (ball.angle <= 1.5 * Math.PI)
        ball.angle = Math.PI * 0.5 + bounceDirection;

    // 4/4 of trig circle
    else if (ball.angle <= 2 * Math.PI)
        ball.angle = Math.PI * 0.5 - bounceDirection;
}

/**
 * @description 
 * vX : horizontal velocity of the ball
 * vY : vertical velocity of the ball
 * check for collisions with vertical walls at next ball step
*/
export function willBallCollideWithWall(ball : Ball, vX : number) {
    const futureBallX = ball.x + vX;
    if (futureBallX + ball.size >= 1 || futureBallX - ball.size <= 0)
    {
        futureBallX + ball.size >= 1 ? ball.x = 1 - ball.size - 0.001 : ball.x = 0 + ball.size + 0.001;
        VerticalCollisionAngle(ball);
        return (true);
    }
    return (false);
}
/**
 * @description 
 * vX : horizontal velocity of the ball
 * vY : vertical velocity of the ball
 * check for collisions and overlap with paddleOnes
*/
export function willBallOverlapPaddleOne(ball : Ball, paddle : Paddle,vx : number, vy : number, gameType : string) {

    const futureBallX = ball.x + vx;
    const futureBallY = ball.y + vy;

    // will ball overlap paddleOne (bottom) next step while comming from the left ?
    if (futureBallY + ball.size >= paddle.y && futureBallX + ball.size >= paddle.x 
        && futureBallX + ball.size <= paddle.x + vx)
    {
        ball.x = paddle.x - ball.size;
        if (gameType === Constants.GAME_TYPE_TWO)
            ShrinkPaddle(paddle);
        VerticalCollisionAngle(ball);
        return (true);
    }
    // will it overlap coming from the right side ?
    else if (futureBallY + ball.size >= paddle.y && futureBallX - ball.size <= paddle.x + paddle.width 
        && futureBallX - ball.size >= paddle.x + paddle.width - vx)
    {
        ball.x = paddle.x + paddle.width + ball.size;
        if (gameType === Constants.GAME_TYPE_TWO)
            ShrinkPaddle(paddle);
        VerticalCollisionAngle(ball);
        return (true);
    }
    // will ball overlap next step while comming from above ?
    else if (futureBallX - ball.size > paddle.x && futureBallX - ball.size < paddle.x + paddle.width
        || futureBallX + ball.size > paddle.x && futureBallX + ball.size < paddle.x + paddle.width)
        {
        if (futureBallY + ball.size > paddle.y)
        {
            ball.y = paddle.y - ball.size;
            if (gameType === Constants.GAME_TYPE_TWO)
                ShrinkPaddle(paddle);
            HorizontalCollisionsAngle(ball, paddle);
            return (true);
        }
    }
    // will it overlap coming from the left side ?
    return (false);
}

/**
 * @description 
 * vX : horizontal velocity of the ball
 * vY : vertical velocity of the ball
 * check for collisions and overlaps with paddleTwo
*/
function ShrinkPaddle(paddle : Paddle)
{
    paddle.hitCount ++;

    let modifier = Math.random();
    while (modifier < 0.1)
        modifier = Math.random();
    paddle.width = Constants.PADDLE_WIDTH * 2 * modifier;
    // paddle.width > 0.1 ? paddle.width -= 0.01 : paddle.width = paddle.width;
}

export function willBallOverlapPaddleTwo(ball : Ball, paddle : Paddle,vx : number, vy : number, gameType : string) {

    const futureBallX = ball.x + vx;
    const futureBallY = ball.y + vy;

    // will ball overlap paddleTwo (Top) next step while comming from underneath ?
    // will it overlap coming from the left side ?
    if (futureBallY - ball.size <= paddle.y + paddle.height && futureBallX + ball.size >= paddle.x 
        && futureBallX + ball.size <= paddle.x + vx)
    {
        ball.x = paddle.x - ball.size;
        if (gameType === Constants.GAME_TYPE_TWO)
            ShrinkPaddle(paddle);
        VerticalCollisionAngle(ball);
        return (true);
    }
    // will it overlap coming from the right side ?
    else if (futureBallY - ball.size <= paddle.y + paddle.height && futureBallX - ball.size <= paddle.x + paddle.width
        && futureBallX - ball.size >= paddle.x + paddle.width - vx)
    {
        ball.x = paddle.x + paddle.width + ball.size;
        if (gameType === Constants.GAME_TYPE_TWO)
            ShrinkPaddle(paddle);
        VerticalCollisionAngle(ball);
        return (true);
    }
    else if (futureBallX - ball.size > paddle.x && futureBallX - ball.size < paddle.x + paddle.width
        || futureBallX + ball.size > paddle.x && futureBallX + ball.size < paddle.x + paddle.width)
    {
        if (futureBallY - ball.size <= paddle.y + paddle.height)
        {
            ball.y = paddle.y + paddle.height + ball.size;
            if (gameType === Constants.GAME_TYPE_TWO)
                ShrinkPaddle(paddle);
            HorizontalCollisionsAngle(ball, paddle);
            return (true);
        }
    }
    return (false);
}
