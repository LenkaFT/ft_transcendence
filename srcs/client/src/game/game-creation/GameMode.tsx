import {
    Box,
    Button,
    Divider,
    Flex,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import authService from "../../auth/auth.service";
import * as Constants from '../globals/const';
import { LeftBracket, RightBracket } from "./Brackets";

function GameMode(props : {dispatch : Function, sock : Socket}) {

    const [playerAvailable, setPlayerAvalaible] = useState(false);
    const [boxWidth, setBoxWidth] = useState('300px');

    useEffect(() => {
        
        function debounce(func : Function, ms : number) {
            let timer : string | number | NodeJS.Timeout;
        
            return ( function(...args : any) {
                clearTimeout(timer);
                timer = setTimeout( () => {
                    timer = null;
                    func.apply(this, args)
                }, ms);
            });
        };

        const debouncedHandleResize = debounce(function handleResize() {
            if (window.innerWidth > 600)
                setBoxWidth('lg');
            else if (window.innerWidth <= 360)
                setBoxWidth('300px')

        }, 100);
        window.addEventListener('resize', debouncedHandleResize)

        return (() => {
            window.removeEventListener('resize', debouncedHandleResize);
        })
    },  [window.innerWidth]);

    useEffect(() => {async function checkPlayerAvailability() {

        try {
            const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/users/isAvailable');
            setPlayerAvalaible(res.data);
        }
        catch (err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)

        }
    }
    checkPlayerAvailability();
    }, [])

    useEffect(() => {

        props.sock?.on('isAvailable', ({bool}) => {
            setPlayerAvalaible(bool);
        })
        return (() => {
            props.sock?.off('isAvailable');
        })
    }, []);

    return (<>
        <Flex flexDir={'column'} wrap={'nowrap'}
            alignItems={'center'}
            justifyContent={'center'}
        >
            <Box h={'380px'} w={boxWidth}
            display={'flex'}
            alignItems={'center'}
            justifyContent={'center'}
            >
                <Box width={'sm'} height={'sm'}
                display={'flex'} flexDir={'row'} 
                alignItems={'center'} justifyContent={'center'}
                >
                    <LeftBracket w={'30px'} h={'150px'} girth={'10px'}/>

                    <Button
                    fontSize={'2xl'}
                    textColor={'white'}
                    bgColor={Constants.BG_COLOR}
                    fontWeight={'normal'}
                    h={'100px'}
                    borderRadius={'0px'}
                    _hover={{background : 'white', textColor: 'black'}}
                    isDisabled={playerAvailable ? false : true}
                    onClick={() => {
                        props.dispatch({type : 'SET_GAME_TYPE', payload : Constants.GAME_TYPE_ONE}); 
                        props.dispatch({type : 'SET_LF_GAME', payload : true});
                        try {
                            authService.patch(process.env.REACT_APP_SERVER_URL + '/users/updateIsAvailable', {isAvailable : false})
                            props.sock.emit('availabilityChange', false);
                        }
                        catch (err) {
                            if (err.response?.data)
                                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
                        }
                    }}> 
                        {Constants.GAME_TYPE_ONE.toLocaleUpperCase()} 
                    </Button>

                    <RightBracket w={'30px'} h={'150px'} girth={'10px'}/>
                </Box>
            </Box>
            
            <Flex flexDir={'row'} width={'100%'}
                alignItems={'center'}
                justifyContent={'center'}
            >
                <Divider variant={'dashed'} w={'35%'}/>
                <Button margin='5%'
                borderRadius={'0'}
                bg={Constants.BG_COLOR} 
                textColor={'white'} 
                fontWeight={'normal'}
                _hover={{background : 'white', textColor: 'black'}}
                onClick={() => {
                    props.dispatch({type : 'SET_GAME_MOD', payload : false});
                    props.dispatch({type : 'SET_PLAY', payload : true});
                }}> GO BACK</Button>
                <Divider variant={'dashed'} w={'35%'}/>
            </Flex>

            <Box h={'380px'} w={boxWidth}
            display={'flex'}
            alignItems={'center'}
            justifyContent={'center'}
            >
                <Box width={'sm'} height={'sm'}
                display={'flex'} flexDir={'row'} 
                alignItems={'center'} justifyContent={'center'}
                >
                    <LeftBracket w={'30px'} h={'150px'} girth={'10px'}/>

                    <Button
                    fontSize={'2xl'}
                    fontWeight={'normal'}
                    textColor={'white'}
                    bgColor={Constants.BG_COLOR}
                    h={'100px'}
                    borderRadius={'0px'}
                    _hover={{background : 'white', textColor: 'black'}}
                    isDisabled={playerAvailable ? false : true}
                    onClick={() => {
                        props.dispatch({type : 'SET_GAME_TYPE', payload : Constants.GAME_TYPE_TWO}); 
                        props.dispatch({type : 'SET_LF_GAME', payload : true})
                        try {
                            authService.patch(process.env.REACT_APP_SERVER_URL + '/users/updateIsAvailable', {isAvailable : false})
                            props.sock.emit('availabilityChange', false);
                        }
                        catch (err) {
                            if (err.response?.data)
                                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`);
                        }
                    }}
                    >
                        {Constants.GAME_TYPE_TWO.toLocaleUpperCase()}
                    </Button>

                    <RightBracket w={'30px'} h={'150px'} girth={'10px'}/>
                </Box>
            </Box>
        </Flex>
    </>)
}

export default GameMode