import { DragHandleIcon } from "@chakra-ui/icons";
import { Button, Link, Popover, PopoverBody, PopoverContent, PopoverTrigger, Portal, useDisclosure, useToast } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import authService from "../../auth/auth.service";
import * as Constants from '../../game/globals/const';
import BasicToast from "../../toast/BasicToast";
import { Room } from "../interfaces/interface";
import InviteModal from "./InviteModal";
import PasswordSettingsModal from "./PasswordSettingsModal";

function ChannelSettings(props : {chatSocket : Socket, room : Room, isOp : boolean, setTargetChannel : Function}) {

    const [action, setAction] = useState("")
    const [isPrivate, setIsPrivate] = useState(false);
    const {isOpen, onOpen, onClose} = useDisclosure()
    const {isOpen: isOpenInvite, onOpen: onOpenInvite, onClose: onCloseInvite} = useDisclosure()
    const toast = useToast();

    async function removePassword(roomId: number){
        try{
            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/removePassword', {roomId: roomId})
            props.chatSocket?.emit('channelStatusUpdate');
            toast({
                duration: 5000,
                render : () => ( <> 
                    <BasicToast text="Password have been successfully removed."/>
                </>)
              })
        }
        catch(err){
            if (err.response?.status === 409)
            {
                toast({
                    duration: 5000,
                    render : () => ( <> 
                        <BasicToast text={err.response?.data?.error}/>
                    </>)
                  })
            }
            if (err.response?.status === 404)
            {
                toast({
                    duration: 5000,
                    render : () => ( <> 
                        <BasicToast text={err.response?.data?.error}/>
                    </>)
                  })
            }
            else
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    function leaveChan(roomId: number){
        
        props.setTargetChannel(undefined)
        props.chatSocket?.emit('leaveRoom', roomId)
    }

    useEffect(() => {

        async function fetchChannelStatus() {
            try {
                const isPriv = await authService.get(process.env.REACT_APP_SERVER_URL + '/room/isPriv/' + props.room.id)

                setIsPrivate(isPriv.data);
            }
            catch(err) {
                setIsPrivate(false);
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        };

        fetchChannelStatus();
    }, [props.room])

    if (props.isOp) {

        return <>
            <Link>
                <Popover closeOnBlur>
                <PopoverTrigger>
                    <Button 
                    bg={'none'}
                    _hover={{bg:'none', transform : 'scale(1.4)'}}
                    ><DragHandleIcon color={'white'}/></Button>
                </PopoverTrigger>
                <Portal>
                    <PopoverContent
                    bg={'white'}
                    border={'none'}
                    >
                    <PopoverBody display={'flex'}
                    flexDir={'column'}
                    className="goma"
                    >
                        <Button onClick={() => {
                            onOpen()
                            setAction('setPass')
                        }}
                        borderRadius={'0px'}
                        margin={'10px'}
                        bg={Constants.BG_COLOR}
                        fontWeight={'normal'}
                        textColor={'white'}
                        _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                        >
                            SET PASSWORD
                        </Button >

                        <Button onClick={() => {
                            onOpen()
                            setAction('changePass')
                        }}
                        borderRadius={'0px'}
                        margin={'10px'}
                        bg={Constants.BG_COLOR}
                        fontWeight={'normal'}
                        textColor={'white'}
                        _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                        >
                            CHANGE PASSWORD
                        </Button>

                        <Button onClick={() => removePassword(props.room.id)}
                        borderRadius={'0px'}
                        margin={'10px'}
                        bg={Constants.BG_COLOR}
                        fontWeight={'normal'}
                        textColor={'white'}
                        _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                        >
                            REMOVE PASSWORD
                        </Button>

                        { isPrivate && <Button onClick={() => {
                            onOpenInvite()
                        }}
                        borderRadius={'0px'}
                        margin={'10px'}
                        bg={Constants.BG_COLOR}
                        fontWeight={'normal'}
                        textColor={'white'}
                        _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                        >
                            INVITE
                        </Button>}

                        <Button onClick={() => leaveChan(props.room.id)}
                        borderRadius={'0px'}
                        margin={'10px'}
                        bg={Constants.BG_COLOR}
                        fontWeight={'normal'}
                        textColor={'white'}
                        _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                        >
                            LEAVE
                        </Button>
                    </PopoverBody>
                    </PopoverContent>
                </Portal>
                </Popover>
            </Link>
        <InviteModal socket={props.chatSocket} roomId={props.room.id} isOpen={isOpenInvite} onOpen={onOpenInvite} onClose={onCloseInvite} />
        <PasswordSettingsModal action={action} roomId={props.room.id} isOpen={isOpen} onOpen={onOpen} onClose={onClose} chatSocket={props.chatSocket} />
        </>
    }
    else {
        
        return (<>
            <Link>
                <Popover>
                <PopoverTrigger>
                    <Button 
                    bg={'none'}
                    _hover={{bg:'none', transform : 'scale(1.4)'}}
                    ><DragHandleIcon color={'white'}/></Button>
                </PopoverTrigger>
                <Portal>
                    <PopoverContent
                    bg={'white'}
                    border={'none'}
                    >
                        <PopoverBody display={'flex'}
                        flexDir={'column'}
                        className="goma"
                        >
                            <Button onClick={() => leaveChan(props.room.id)}
                            borderRadius={'0px'}
                            margin={'10px'}
                            bg={Constants.BG_COLOR}
                            fontWeight={'normal'}
                            textColor={'white'}
                            _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                            >
                                LEAVE
                            </Button>
                        </PopoverBody>
                    </PopoverContent>
                </Portal>
                </Popover>
            </Link>
        </>)
    }
}

export default ChannelSettings

