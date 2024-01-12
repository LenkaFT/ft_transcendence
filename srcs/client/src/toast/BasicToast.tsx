import { Flex, Text } from "@chakra-ui/react";
import React from "react";
import * as Constants from '../game/globals/const';

function BasicToast(props : {text : string,children? : React.ReactNode}) {
    
    return (
        <Flex w={'320px'}
        h={'130px'}
        padding={'10px'}
        className='goma'
        bgColor={Constants.BG_COLOR_LESSER_FADE}
        justifyContent={'space-evenly'}
        alignItems={'center'}
        flex={'row'}
        wrap={'wrap'}
        >
          <Text w={'100%'} textColor={'white'} textAlign={'center'}> {props.text} </Text>
          {props.children}
        </Flex>
    )
}

export default BasicToast