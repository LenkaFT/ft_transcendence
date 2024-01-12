import {
    Box,
    Button,
    Flex,
    Kbd,
    Text
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import '../../fonts.css';
import * as Constants from '../globals/const';

function PlayBox(props : {dispatch : Function}) {

    type FlexDirection = "column" | "inherit" | "-moz-initial" | "initial" | "revert" | "unset" | "column-reverse" | "row" | "row-reverse" | undefined;
    
    const [flexDisplay, setFlexDisplay] = useState<FlexDirection>(window.innerWidth > 1200 ? 'row' : 'column');
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
            if (window.innerWidth < 1200)
                setFlexDisplay('column');
            else if (window.innerWidth >= 1200)
                setFlexDisplay('row');
            if (window.innerWidth > 600)
                setBoxWidth('sm');
            else if (window.innerWidth <= 360)
                setBoxWidth('300px')

        }, Constants.DEBOUNCE_TIME);
        window.addEventListener('resize', debouncedHandleResize)

        return (() => {
            window.removeEventListener('resize', debouncedHandleResize);
        })
    },  [flexDisplay]);

    return (
    <Flex w={'100%'} flexDir={flexDisplay} wrap={'wrap'} overflowX={'auto'} justifyContent={'space-evenly'} alignItems={'center'}>

        <Box
        width={boxWidth} 
        height={'sm'} 
        display={'flex'}
        flexDirection={'row'}
        alignItems={'center'}
        padding={'10px'}
        textColor={'white'}
        >
            <Flex w={'95%'} h={'100%'}
            flexDirection={'column'}
            textAlign={'center'}
            alignItems={'center'}
            >
                <Text w={'95%'} h={'30%'} as='h1' className='goma' fontSize={'2em'}> Standard Mod </Text>

                <Text>
                    your average pong, except its vertically orientend. Angle redirection will also tend to make it
                    more important to hit the ball with the extremities of your paddle
                </Text>
            </Flex>
        </Box>

        <Box  width={boxWidth} 
        height={'sm'} 
        display={'flex'}
        flexDirection={'row'}
        alignItems={'center'}
        padding={'10px'}
        textColor={'white'}
        >
            <Flex direction="column" height="100%" width='100%'>
                <Box h="50%" w="100%"
                    display={'flex'}
                    flexDirection={'row'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    >
                    <Button fontWeight={'normal'} onClick={() => {
                        props.dispatch({type : 'SET_PLAY', payload : false});
                        props.dispatch({type : 'SET_GAME_MOD', payload : true});
                    }} _hover={{transform: 'scale(1.5)'}} className='goma'
                    borderRadius={'0px'}
                    size={'lg'}
                    > 
                    PLAY</Button>
                </Box>

                <Flex h="50%" w="100%">
                    <Box h="100%" w="50%"
                        display={'flex'}
                        flexDirection={'column'}
                        alignItems={'center'}
                        justifyContent={'center'}
                        textAlign={'center'}
                        marginRight={'2px'}
                        >
                        <Kbd textColor={'black'}> A </Kbd>  
                        <Text > Will make your paddle go <b>Left</b> </Text>
                    </Box>

                    <Box h="100%" w="50%"
                        display={'flex'}
                        flexDirection={'column'}
                        alignItems={'center'}
                        justifyContent={'center'}
                        textAlign={'center'}
                        marginLeft={'2px'}
                        >
                        <Kbd textColor={'black'}> D </Kbd>  
                        <Text > Will make your paddle go <b>Right</b> </Text>
                    </Box>
                </Flex>
            </Flex>
        </Box>

        <Box
        width={boxWidth} 
        height={'sm'} 
        display={'flex'}
        flexDirection={'row'}
        alignItems={'center'}
        padding={'10px'}
        textColor={'white'}
        >
            <Flex w={'95%'} h={'100%'}
            flexDirection={'column'}
            textAlign={'center'}
            alignItems={'center'}
            >
                <Text w={'95%'} h={'30%'} as='h1' className='goma' fontSize={'2em'}> Randomode </Text>

                <Text>
                    Your paddle will shrink or grow on every hit ! never know what's coming huhuhu.
                </Text>
            </Flex>
        </Box> 
    </Flex>
    )
}

export default PlayBox