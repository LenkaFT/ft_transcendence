import React from "react"
import * as Const from "../../game/globals/const"

import {
    Button,
    useDisclosure
} from "@chakra-ui/react"
import { Socket } from "socket.io-client"
import ChannelCreationModal from "./ChannelCreationModal"
 
function ChannelCreator (props: {chatSocket: Socket, setTargetRoom: Function}){
    const {isOpen, onOpen, onClose} = useDisclosure()

    return (
        <>
           <Button
            fontWeight={'normal'}
            borderRadius={'0px'}
            textAlign={'center'}
            bg={'none'}
            textColor={'white'}
            _hover={{background : 'white', textColor : Const.BG_COLOR}}
            onClick={() => (onOpen())}
            >
                CREATE CHANNEL
            </Button>
            <ChannelCreationModal isOpen={isOpen} onOpen={onOpen} onClose={onClose} chatSocket={props.chatSocket} setTargetRoom={props.setTargetRoom}/>
        </>
    )
}

export default ChannelCreator