import { Box } from "@chakra-ui/react";
import React from "react";

export function LeftBracket(props : {w : string, h : string, girth : string, marginRight?: string}) {
    
    let m : string = '10px';

    if (props.marginRight)
        m = props.marginRight;
    return (
        <Box w={props.w} h={props.h}
            content='  '
            border={'10px solid white'}
            borderWidth={props.girth}
            borderRight={'none'}
            marginRight={m}
        ></Box>
    )
}

export function RightBracket(props : {w : string, h : string, girth : string, marginLeft?: string}) {
    
    let m : string = '10px';

    if (props.marginLeft)
        m = props.marginLeft;
    return (
        <Box w={props.w} h={props.h}
            content='  '
            border={'10px solid white'}
            borderWidth={props.girth}
            borderLeft={'none'}
            marginLeft={m}
        ></Box>
    )
}