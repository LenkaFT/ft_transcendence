import {
  Box,
  Button,
  Flex,
  Text
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import * as Constants from '../globals/const';

 function WaitingScreen(props : {dispatch : Function, sock : Socket, roomName : string}) {
    
    function leaveQueue() {

      props.sock?.emit('leaveQueue', {roomName : props.roomName});

      props.dispatch({type : 'SET_LF_GAME', payload : false});
      props.dispatch({type : 'SET_WAITING_SCREEN', payload : false});
      props.dispatch({type : 'SET_GAME_TYPE', payload : ''})
      props.dispatch({type : 'SET_PLAY', payload : true});
    }

    const [dot, setDot] = useState('.');
    useEffect(() => {
        const dotdotdot = setInterval(() => {
          switch (dot) {
            case '.':
              setDot('..');
              break;
            case '..':
              setDot('...');
              break;
            case '...':
              setDot('.');
              break;
            default:
              break;
          }
        }, 1000);
    
        return () => clearInterval(dotdotdot);
    }, [dot]);

    return (
        <Flex w={'100%'} h={'100%'} minH={'sm'} minHeight={'sm'}
        wrap={'nowrap'}
        flexDirection={'column'}
        alignItems={'center'}
        justifyContent={'center'}
        textColor={'white'}
        >
            <Box width={'100%'} height={'50%'}
            display={'flex'}
            alignItems={'center'}
            justifyContent={'center'}
            >
                <Text fontSize="2xl" textAlign="center" style={{display : 'flex', flexDirection: 'row'}}>
                    LOOKING FOR GAME {dot}
                </Text>
            </Box>

            <Box width={'100%'} height={'50%'}
            display={'flex'}
            alignItems={'center'}
            justifyContent={'center'}
            >
                <Button bg={Constants.BG_COLOR} textColor={'white'} borderRadius={'0'} fontSize={'2xl'} fontWeight={'normal'}
                _hover={{background : 'white', textColor: 'black'}}
                onClick={leaveQueue} 
                > 
                LEAVE QUEUE </Button>
            </Box>
    </Flex>
    )
}

export default WaitingScreen;