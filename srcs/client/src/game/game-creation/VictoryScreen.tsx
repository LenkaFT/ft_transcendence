import {
    Box,
    Button,
    Text,
} from "@chakra-ui/react";
import React from "react";
import * as Constants from '../globals/const';


 function VictoryScreen (props : {dispatch : Function}) {
    function closeVScreen() {
        props.dispatch({type : 'SET_V_SCREEN', payload : false})
        props.dispatch({type : 'SET_PLAY', payload : true})
    };
    
    return (<>
        <Box h={'100%'} w={'100%'}
        display={'flex'}
        flexDirection={'column'}
        alignItems={'center'}
        justifyContent={'center'}
        textColor={'white'}
        overflow={'auto'}
        minH={'sm'}
        textAlign={'center'}
        >
            <Text fontSize={'5em'}> YOU WON </Text>

            <Button 
            fontWeight={'normal'} textColor={'white'} 
            size={'2em'} bg={Constants.BG_COLOR} fontSize={'2em'}
            borderRadius={'0'}
            display={'flex'}
            _hover={{background : 'white', textColor: 'black'}}
            onClick={closeVScreen}
            >
            GO BACK ?</Button>
        </Box>
    </>)
}

export default VictoryScreen
