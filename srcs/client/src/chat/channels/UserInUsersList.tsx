import React, {useState, useEffect, useRef} from "react"
import authService from "../../auth/auth.service"
import { Socket } from "socket.io-client";
import ProfileModal from "../../profile/modal/ProfileModal";
import { Room } from "../interfaces/interface";
import BasicToast from "../../toast/BasicToast";
import { Image, Button, Link, Popover, PopoverBody, PopoverContent, PopoverTrigger, Portal, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Text, Tooltip, useDisclosure, useToast, Box } from "@chakra-ui/react";
import * as Constants from '../../game/globals/const';

function UserInUsersList(props : {username : string, userId : string, 
    room : Room, userIsOp : boolean, gameSock? : Socket, chatSock?: Socket}) {

    const [targetIsOp, setTargetIsOp] = useState<"isAdmin" | "isOwner" | "no">("no");
    const [targetIsMuted, setTargetIsMuted] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [popOpen, setPopOpen] = useState(false);
    const toast = useToast();


    async function makeThemOp(targetId : string, roomId : number) {
          try {
              await authService.post(process.env.REACT_APP_SERVER_URL + '/room/giveAdminPrivileges', 
              {targetId : targetId, roomId : roomId});
              setTargetIsOp('isAdmin')
              props.chatSock?.emit('channelRightsUpdate', {roomId : roomId});
          }
          catch (err) {
            if (err.response?.status === 409)
            {
                toast({
                    duration: 5000,
                    isClosable: true,
                    render : () => ( <> 
                        <BasicToast text={err.response?.data?.error}/>
                    </>)
                  })
            }
            else
              if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
          }
    };

    async function fuckThemOp(targetId : string, roomId : number) {
        try {
            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/removeAdminPrivileges', 
            {targetId : targetId, roomId : roomId});
            setTargetIsOp('no');
            props.chatSock?.emit('channelRightsUpdate', {roomId : roomId});
        }
        catch (err) {
            if (err.response?.status === 409)
            {
                toast({
                    duration: 5000,
                    isClosable: true,
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

    async function muteThem(targetId : string, roomId : number, roomName : string, timeInMinutes : number) {
        try {
            
            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/muteUser', 
            {targetId : targetId, roomId : roomId, timeInMinutes : timeInMinutes});
            setTargetIsMuted(true);
            props.chatSock?.emit('userGotBannedOrMuted', {roomId : roomId, timeInMinutes : timeInMinutes});
        }
        catch (err) {
            if (err.response?.status === 409)
            {
                toast({
                    duration: 5000,
                    isClosable: true,
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

    async function unmuteThem(targetId : string, roomId : number) {
        try {
            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/unmuteUser', 
            {targetId : targetId, roomId : roomId});
            setTargetIsMuted(false);
            props.chatSock?.emit('channelRightsUpdate', {roomId : roomId});
        }
        catch (err) {
            if (err.response?.status === 409)
            {
                const id = 'muteId'
                if(!toast.isActive(id)) {
                toast({
                    duration: 2000,
                    isClosable: true,
                    render : () => ( <> 
                        <BasicToast text={err.response?.data?.error}/>
                    </>)
                  })
                }
            }
            else
              if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    async function banThem(targetId : string, roomId : number, roomName : string,timeInMinutes : number) {
        try {

            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/banUser', 
            {targetId : targetId, roomId : roomId, timeInMinutes : timeInMinutes});
            props.chatSock?.emit('userGotBanned', {targetId : targetId, roomName : roomName});
            props.chatSock?.emit('userGotBannedOrMuted', {roomId : roomId, timeInMinutes : timeInMinutes});
        }
        catch (err) {
            if (err.response?.status === 409)
            {
                const id = 'banId'
                if(!toast.isActive(id)) {
                toast({
                    duration: 5000,
                    render : () => ( <> 
                        <BasicToast text={err.response?.data?.error}/>
                    </>)
                  })
                }
            }
            else
              if (err.response?.data)
console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    function kick(roomId: number, targetId: string){
        props.chatSock?.emit('kick', {roomId: roomId, targetId: targetId})
    }
    
    useEffect(() => {
        async function asyncWrapper() {
            try {
                const privi = await authService.post(process.env.REACT_APP_SERVER_URL + '/room/userPrivileges',
                {targetId : props?.userId, roomId : props.room.id});
                
                if(privi.data === 'isOwner')
                    setTargetIsOp('isOwner')
                else if(privi.data === 'isAdmin')
                    setTargetIsOp('isAdmin')
                else if (privi.data === 'no')
                    setTargetIsOp('no');
                if (privi.data === 'isMuted')
                    setTargetIsMuted(true);
                else if (privi.data !== 'isMuted')
                    setTargetIsMuted(false);
            }
            catch (err) {
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        }

        asyncWrapper();
    }, [props.room, props.userId])

    useEffect( function socketEvent() {

        async function asyncWrapper() {
            try {
                const privi = await authService.post(process.env.REACT_APP_SERVER_URL + '/room/userPrivileges',
                {targetId : props?.userId, roomId : props.room?.id});
                
                if (privi.data === 'isMuted')
                    setTargetIsMuted(true);
                else
                    setTargetIsMuted(false);
            }
            catch (err) {
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        }
        props.chatSock?.on('timeoutEnd', () => {
            asyncWrapper()
        })
        props.chatSock?.on('kickedError', (err) => {
            const id = 'kickedErrorId'
            if(!toast.isActive(id)) {
            toast({
                id,
                duration: 5000,
                render : () => ( <> 
                    <BasicToast text={err.response?.message}/>
                </>)
              })
            }
        })
        return(() => {
            props.chatSock?.off('timeoutEnd')
            props.chatSock?.off('kickedError')
        })
    })

    useEffect(() => {

        if (buttonRef && popOpen === true)
            buttonRef?.current?.click();
    }, [targetIsMuted, targetIsOp])

    function MuteBanSlider(props : {targetId : string, roomId : number, roomName : string, actionName : string ,action : Function}) {
        const [sliderValue, setSliderValue] = React.useState(5)
        const [showTooltip, setShowTooltip] = React.useState(false)
        return (<>
            <Button onClick={() => props.action(props.targetId, props.roomId, props.roomName, sliderValue)}
            borderRadius={'0px'}
            margin={'10px'}
            bg={Constants.BG_COLOR}
            fontWeight={'normal'}
            textColor={'white'}
            _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
            >
                {props.actionName.toLocaleUpperCase()} FOR
            </Button>        
            <Slider
            id='slider'
            defaultValue={0}
            min={0}
            max={120}
            colorScheme='black'
            onChange={(v) => setSliderValue(v)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            >
                <SliderTrack>
                    <SliderFilledTrack />
                </SliderTrack>
                
                <Tooltip
                    hasArrow
                    bg='black'
                    color='white'
                    placement='top'
                    isOpen={showTooltip}
                    label={`${sliderValue}min`}
                >
                <SliderThumb boxSize={4} bg={'black'}/>
                </Tooltip>
            </Slider>
            <Text>zero minutes will set timer to an undefined amounth of time</Text>
        </>)
    }

    if (props.userIsOp)
    {

    return (<>
            <Popover closeOnBlur>
                <PopoverTrigger >
                    <Button
                    onClick={() => setPopOpen(curr => !curr)}
                    ref={buttonRef}
                    borderRadius={'0px'}
                    fontWeight={'normal'}
                    textColor={'black'}
                    paddingLeft={'12px'}
                    paddingRight={'12px'}
                    bg={'white'}
                    _hover={{bg : Constants.WHITE_BUTTON_HOVER}}
                    >
                        {targetIsOp === 'isOwner' && <Image boxSize={5} title="https://icons8.com/icon/12566/crown" src={'./icons/crown.png'} marginRight={'3px'}/>}
                        {targetIsOp === 'isAdmin' && <Image boxSize={5} title="https://icons8.com/icon/5336/sword" src={'./icons/blackSword.png'} marginRight={'3px'}/>}
                        {targetIsMuted && <Image boxSize={5} title="https://icons8.com/icon/644/mute" src={'./icons/blackMute.png'} marginRight={'3px'}/>}
                        {props?.username}
                    </Button>
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
                            {targetIsOp === 'no'  && 
                            <Button onClick={() => makeThemOp(props?.userId, props.room?.id)}
                            borderRadius={'0px'}
                            margin={'10px'}
                            bg={Constants.BG_COLOR}
                            fontWeight={'normal'}
                            textColor={'white'}
                            _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                            >
                                PROMOTE
                            </Button>}

                            {targetIsOp === 'isAdmin' && 
                            <Button onClick={() => fuckThemOp(props?.userId, props.room?.id)}
                            borderRadius={'0px'}
                            margin={'10px'}
                            bg={Constants.BG_COLOR}
                            fontWeight={'normal'}
                            textColor={'white'}
                            _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                            >
                                DEMOTE
                            </Button>}

                            <MuteBanSlider targetId={props?.userId} roomId={props.room?.id} roomName={props.room?.name} actionName="ban" action={banThem}/>

                            {!targetIsMuted && <MuteBanSlider targetId={props?.userId} roomId={props.room?.id} roomName={props.room?.name} actionName="mute" action={muteThem}/>}
                            
                            { targetIsMuted &&
                            <Button onClick={() => unmuteThem(props?.userId, props.room?.id)}
                            borderRadius={'0px'}
                            margin={'10px'}
                            bg={Constants.BG_COLOR}
                            fontWeight={'normal'}
                            textColor={'white'}
                            _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                            >
                                UNMUTE
                            </Button>}

                            <Button onClick={() => kick(props?.room.id, props?.userId)}
                            borderRadius={'0px'}
                            margin={'10px'}
                            bg={Constants.BG_COLOR}
                            fontWeight={'normal'}
                            textColor={'white'}
                            _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                            >
                                KICK
                            </Button>

                            <Button onClick={onOpen}
                            borderRadius={'0px'}
                            margin={'10px'}
                            bg={Constants.BG_COLOR}
                            fontWeight={'normal'}
                            textColor={'white'}
                            _hover={{bg : Constants.BG_COLOR, transform : 'scale(1.1)'}}
                            >
                                PROFILE
                            </Button>
                        </PopoverBody>
                    </PopoverContent>
                </Portal>
            </Popover>
        <ProfileModal userId={props.userId} isOpen={isOpen} onClose={onClose} onOpen={onOpen} chatSocket={props.chatSock} gameSock={props.gameSock}/>
    </>)
    }
    else {
        return (<>
            <Button onClick={onOpen}
            borderRadius={'0px'}
            fontWeight={'normal'}
            textColor={'black'}
            paddingLeft={'12px'}
            paddingRight={'12px'}
            bg={'white'}
            _hover={{bg : Constants.WHITE_BUTTON_HOVER}}
            >
                {targetIsOp === 'isOwner' && <Image boxSize={5} title="https://icons8.com/icon/12566/crown" src={'./icons/crown.png'} marginRight={'3px'}/>}
                {targetIsOp === 'isAdmin' && <Image boxSize={5} title="https://icons8.com/icon/5336/sword" src={'./icons/blackSword.png'} marginRight={'3px'}/>}
                {targetIsMuted && <Image boxSize={5} title="https://icons8.com/icon/644/mute" src={'./icons/blackMute.png'} marginRight={'3px'}/>}
                {props?.username}
            </Button>
            <ProfileModal userId={props.userId} isOpen={isOpen} onClose={onClose} onOpen={onOpen} chatSocket={props.chatSock} gameSock={props.gameSock}/>
        </>)
    }
}

export default UserInUsersList