import React, { Component } from 'react'
import { useRef, useEffect, useState, useReducer } from 'react'
import { Socket, io } from 'socket.io-client'
import * as Constants from '../globals/const'
import { 
    Box,
    Text,
    Avatar,
    Flex,
    WrapItem
    } from '@chakra-ui/react';
import { 
    drawScore,
    drawBall,
    drawPaddle,
    drawAdversaryPaddle,
    drawMidPointCt,
    drawBoard } from './Draw';
import { 
    GameInfo,
    GameProps,
    GameMetrics,
    userBasicInfos
    } from '../globals/interfaces';
import authService from '../../auth/auth.service';

/**
 * @description 
 * props are :
 * - gameType
 * - width
 * - height
*/
function Game(props : GameProps) {
    const canvasRef = useRef(null);
    const gameZone = document.getElementById(Constants.GAME_ZONE);
    const sock : Socket = props.sock;
    const [dimension, setDimension] = useState({
        height : gameZone.clientWidth <= gameZone.clientHeight ? gameZone.clientWidth : gameZone.clientHeight,
        width : gameZone.clientWidth <= gameZone.clientHeight ? gameZone.clientWidth : gameZone.clientHeight
    })
    const [midPointCT, setMidPointCT] = useState(0);
    const [midPointCTOn, setMidPointCTOn] = useState(false);
    const [ctSizeModifier, setCtSizeModifier] = useState(1);

    const [playerOneScore, setPlayerOneScore] = useState(0);
    const [playerTwoScore, setPlayerTwoScore] = useState(0);

    const [userOne, setUserOne] = useState<userBasicInfos>()
    const [userTwo, setUserTwo] = useState<userBasicInfos>()
    const [gameMetrics, setGameMetrics] = useState<GameMetrics>({
        paddleOne : {
            x : 0.5 - Constants.PADDLE_WIDTH / 2,
            y : props.playerId === '1' ? 1 - Constants.PADDLE_HEIGHT : 0,
            movingLeft : false,
            movingRight : false,
            speed : Constants.PADDLE_SPEED,
            width : props.gameType === Constants.GAME_TYPE_TWO ? Constants.PADDLE_WIDTH * 2: Constants.PADDLE_WIDTH,
            height : Constants.PADDLE_HEIGHT,
            hitCount : 0,
        },
        paddleTwo :
        {
            x : 0.5 - Constants.PADDLE_WIDTH / 2,
            y : props.playerId === '1' ? 0 : 1 - Constants.PADDLE_HEIGHT,
            movingLeft : false,
            movingRight : false,
            speed : Constants.PADDLE_SPEED,
            width : props.gameType === Constants.GAME_TYPE_TWO ? Constants.PADDLE_WIDTH * 2: Constants.PADDLE_WIDTH,
            height :  Constants.PADDLE_HEIGHT,
            hitCount : 0,
        },
        ball : {
            x : 0.5,
            y : 0.5,
            size : 0.020,
            color : 'white',
            angle : 0,
            speed : 0
        }
    });

    const gameInfo : GameInfo = {
            gameType : props.gameType,
            playerId : props.playerId,
            roomName : props.gameRoom
        }

    useEffect(function getUserBasicInfos() {

        sock?.on('gameStarted', (userOneInfo : userBasicInfos, userTwoInfo : userBasicInfos) => {
            setUserOne(userOneInfo);
            setUserTwo(userTwoInfo);
        })

        return (() => {
            sock?.off('gameStarted');
        })
    }, [userOne, userTwo, props.sock])

    useEffect(function resizeEvents() {

        /**
         * @description 
         * temperate the usage of a function in a useEffect and only call it once every X millisecond (ms)
        */
        function debounce(func : Function, ms : number) {
            let timer : string | number | NodeJS.Timeout;
        
            return ( function(...args : any) {
                clearTimeout(timer);
                timer = setTimeout( () => {
                    timer = null;
                    func.apply(this, args)
                }, ms);
            });
        } 

        const debouncedHandleResize = debounce (function handleResize() {
            
            if (gameZone.clientWidth < gameZone.clientHeight)
            {
                setDimension({
                    height : gameZone.clientWidth,
                    width : gameZone.clientWidth
                });
            }
            else 
            {
                setDimension({
                    height : gameZone.clientHeight,
                    width : gameZone.clientHeight
                });
            }
        }, Constants.DEBOUNCE_TIME);

        window.addEventListener("resize", debouncedHandleResize);
        return (
            () => {
                window.removeEventListener("resize", debouncedHandleResize)
            }
        )
    }, [dimension])

    useEffect (function startUp() {

        function handleKeydown(event : globalThis.KeyboardEvent) {

            switch (event.key.toLowerCase())
            {
                case Constants.LEFT :
                    sock.emit('playerMove', {key : event.key, playerId : props.playerId,room : props.gameRoom});
                case Constants.RIGHT:
                    sock.emit('playerMove', {key : event.key, playerId : props.playerId,room : props.gameRoom});
                    break ;
                default :
                    break ;
            }
        }

        function handleKeyup(event : globalThis.KeyboardEvent) {

            switch (event.key.toLowerCase())
            {
                case Constants.LEFT :
                    sock.emit('playerMoveStopped', {key : event.key, playerId : props.playerId,room : props.gameRoom});
                    break ;
                case Constants.RIGHT:
                    sock.emit('playerMoveStopped', {key : event.key, playerId : props.playerId,room : props.gameRoom});
                    break ;
                default :
                    break ;
            }
        }

        function handleFocusOut() {

            sock.emit('playerMoveStopped', {key : Constants.LEFT, playerId : props.playerId,room : props.gameRoom});
            sock.emit('playerMoveStopped', {key : Constants.RIGHT, playerId : props.playerId,room : props.gameRoom});
        }

        function leaveGameOnRefresh() {
            sock.emit('leaveGame', gameInfo);
            sock.emit('availabilityChange', true)
        }

        document.addEventListener("keydown", handleKeydown);
        document.addEventListener("keyup", handleKeyup);
        window.addEventListener("beforeunload", leaveGameOnRefresh);
        window.addEventListener("blur", handleFocusOut)

        if (gameInfo.gameType != undefined && gameInfo.playerId != undefined && gameInfo.roomName != undefined)
        {
            sock.emit('startGameLoop', gameInfo);
        }
        return (() => {
            document.removeEventListener('keydown', handleKeydown);
            document.removeEventListener('keyup', handleKeyup);
            window.removeEventListener("beforeunload", leaveGameOnRefresh)
            window.removeEventListener("blur", handleFocusOut);
        })
    }, []);
    
    useEffect(() => {

        const canvas : HTMLCanvasElement = canvasRef.current;
        const context : CanvasRenderingContext2D = canvas.getContext('2d');
        const canvasBounding : DOMRect = canvas.getBoundingClientRect();

        sock?.on('pointScored', (playerId, newScore) => {

            if (playerId === 1)
                setPlayerOneScore(newScore);
            else if (playerId === 2)
                setPlayerTwoScore(newScore);
        });

        sock?.on('gameMetrics', (pOneMetrics : GameMetrics, pTwoMetrics : GameMetrics) => {
            
            if(props.playerId === '1')
                setGameMetrics(pOneMetrics);
            else if(props.playerId === '2')
                setGameMetrics(pTwoMetrics);
        });

        sock?.on('midPointCt', (ct : number) => {
            setMidPointCTOn(true);
            setMidPointCT(ct);
            setCtSizeModifier(1);
        });

        sock?.on('midPointCtEnd', () => {
            setMidPointCTOn(false);
            setMidPointCT(0);
            setCtSizeModifier(1);
        });

        sock?.once('gameOver', () => {
            sock.emit('leaveGame', gameInfo);
        })
        
        function update() {

            drawBoard(context, canvasBounding);
            
            if (props.playerId === '1')
            {
                drawScore(playerOneScore, 'bottom', Constants.LIGHT_BLUE, context, canvasBounding);
                drawScore(playerTwoScore, 'top', Constants.LIGHT_RED, context, canvasBounding);
            }
            
            else if (props.playerId === '2')
            {
                drawScore(playerOneScore, 'bottom', Constants.LIGHT_RED, context, canvasBounding);
                drawScore(playerTwoScore, 'top', Constants.LIGHT_BLUE, context, canvasBounding);
            }
            drawAdversaryPaddle(context, canvasBounding, gameMetrics.paddleTwo);
            drawPaddle(context, canvasBounding, gameMetrics.paddleOne);
            
            if (midPointCTOn && playerOneScore < Constants.SCORE_TO_REACH && playerTwoScore < Constants.SCORE_TO_REACH)
                drawMidPointCt(context, canvasBounding, ctSizeModifier, midPointCT);
            
            else
                drawBall(context, canvasBounding, gameMetrics.ball);

        }
            
        update();

        return () => {
            sock.off('scoreChange');
            sock.off('midPointCt');
            sock.off('midPointCtEnd');
            sock.off('gameMetrics');
        };
    }, [dimension, playerOneScore, playerTwoScore, midPointCT, midPointCTOn, ctSizeModifier, gameMetrics]);

    return (<>
        <Flex flexDir={'column'} textColor={'white'} fontSize={'1em'}>

            <Box display={'flex'} flexDirection={'row'}
                height={dimension.height * 0.08}
                width={dimension.width * 0.6}
                overflow={'auto'}
            >
                <WrapItem height={'100%'} width={'15%'}>
                    <Avatar
                    height={'100%'}
                    width={'100%'}
                    name={userTwo?.username}
                    src={userTwo?.id != undefined ? process.env.REACT_APP_SERVER_URL + '/users/avatar/' + userTwo?.id : ''}
                    />
                </WrapItem>
                <Text
                size='xs'
                > {userTwo?.username}</Text>
            </Box>
            
            <Box borderLeft={'2px solid white'} borderRight={'2px solid white'}>
                <canvas ref={canvasRef} width={dimension.width * 0.6} height={dimension.height * 0.8} ></canvas>
            </Box>
            
            <Box display={'flex'} flexDirection={'row-reverse'}
                height={dimension.height * 0.08}
                width={dimension.width * 0.6}
                overflow={'auto'}
            >
                <WrapItem height={'100%'} width={'15%'}>
                    <Avatar
                    height={'100%'}
                    width={'100%'}
                    name={userOne?.username}
                    src={userOne?.id != undefined ? process.env.REACT_APP_SERVER_URL + '/users/avatar/' + userOne?.id : ""}
                    />
                </WrapItem>
                <Text> {userOne?.username} </Text>
            </Box>

        </Flex>
    </>)
}

export default Game