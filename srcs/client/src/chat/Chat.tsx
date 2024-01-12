import { Divider, Flex, useToast } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import * as Constants from '../game/globals/const';
import BasicToast from "../toast/BasicToast";
import ChannelCreator from "./channel-creation/ChannelCreator";
import ChannelList from "./lists/ChannelList";
import ChatBox from "./ChatBox";
import FriendList from "./lists/FriendList";
import UserList from "./lists/UserList";
import { Room } from "./interfaces/interface";

function Chat(props: {chatSocket: Socket, gameSocket : Socket}) {

    type FlexDirection = "column" | "inherit" | "-moz-initial" | "initial" | "revert" | "unset" | "column-reverse" | "row" | "row-reverse" | undefined;

    const [boxWidth, setBoxWidth] = useState(window.innerWidth <= 960 ? '100%' : '15%');
    const [boxHeight, setBoxHeight] = useState(window.innerWidth <= 960 ? 'calc(100% / 3)' : '100%');
    const [flexDir, setFlexDir] = useState<FlexDirection>(window.innerWidth <= 960 ? 'column' : 'row');
    const [targetRoom, setTargetRoom] = useState<Room>(undefined);
    const toast = useToast();

    useEffect(function DOMEvents() {

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
    
        const debouncedHandleResize = debounce (function handleResize() {
            if (window.innerWidth <= 960)
            {
                setBoxWidth('100%');
                setBoxHeight('calc(100% / 3)');
                setFlexDir('column');
            }
            else
            {
                setBoxWidth('320px');
                setBoxHeight('100%');
                setFlexDir('row');
            }

        }, Constants.DEBOUNCE_TIME)
    
        window.addEventListener('resize', debouncedHandleResize)
    
        return(() => {
          window.removeEventListener('resize', debouncedHandleResize)
        })
      }, [])

    useEffect(function sockEvent() {
    
        props.chatSocket?.on('userBlocked', (err: string) => {
            const id = 'blocked-toast';
            if(!toast.isActive(id)) {
                toast({
                id,
                isClosable: true,
                duration : 5000,
                render : () => ( <> 
                    <BasicToast text={err}/>
                </>)
                })
            }
        });

        props.chatSocket?.on('dmRoom', (dm : Room) => {

            props.chatSocket?.emit("joinRoom", dm.id)
            setTargetRoom(dm)
        });

        props.chatSocket?.on('kickBy', (kickByUsername: string, roomName : string) => {

        if (targetRoom && roomName === targetRoom?.name)
        {
            setTargetRoom(undefined);
        }
        
        const id = 'kickby-toast';
        if(!toast.isActive(id)) {
            toast({
            id,
            isClosable: true,
            duration : 5000,
            render : () => ( <> 
                <BasicToast text={'you have been kicked from ' + roomName + ` by ${kickByUsername}`}/>
            </>)
            })
        }
        })

        props.chatSocket?.on('expeledFromChan', (roomName) => {
          
            if (targetRoom && roomName === targetRoom?.name)
            {
                setTargetRoom(undefined);
            }
        });

        return (() => {
            props.chatSocket?.off('kickBy');            
            props.chatSocket?.off('userBlocked')
            props.chatSocket?.off('dmRoom')
            props.chatSocket?.off('expeledFromChan')
        })
    })

    return (<>
    <Flex
    w={'100%'}
    h={Constants.BODY_HEIGHT}
    wrap={'nowrap'}
    flexDir={flexDir}
    textColor={'white'}
    bg={Constants.BG_COLOR}
    >

        <Flex
        w={boxWidth}
        h={boxHeight}
        maxWidth={boxWidth}
        minH={'450px'}
        flexDir={'column'}
        bg={Constants.BG_COLOR}
        >
            <Flex h={'100px'}
            w={'100%'}
            bg={Constants.BG_COLOR}
            justifyContent='center'
            alignItems='center'
            >
                <ChannelCreator chatSocket={props.chatSocket} setTargetRoom={setTargetRoom}/>
            </Flex>
            <Flex justifyContent='center'>
                <Divider variant='dashed' width='90%' />
            </Flex>
            <Flex h={'95%'}
            w={'100%'}
            bg={Constants.BG_COLOR}
            >
                <ChannelList chatSocket={props.chatSocket} setTargetRoom={setTargetRoom} targetRoom={targetRoom}/>
            </Flex>
        </Flex>

        <Flex
        w={boxWidth === '100%' ? boxWidth : 'calc(100% - 620px)'}
        h={boxHeight}
        minH={'450px'}
        bg={Constants.BG_COLOR_FADED} 
        >
            {targetRoom != undefined && 
            <ChatBox isDm={targetRoom.type === 'dm' ? true : false}
            room={targetRoom}
            gameSocket={props.gameSocket}
            chatSocket={props.chatSocket}
            setTargetRoom={setTargetRoom}
            />}
        </Flex>

        <Flex
        w={boxWidth}
        h={boxHeight}
        maxWidth={boxWidth}
        minH={'450px'}
        bg={Constants.BG_COLOR}
        flexDir={'column'} 
        >
            <FriendList chatSocket={props.chatSocket} gameSocket={props.gameSocket}/>

            <Flex justifyContent='center'>
                <Divider variant='dashed' width='90%' />
            </Flex>

            <UserList chatSocket={props.chatSocket} gameSocket={props.gameSocket}/>
        </Flex>
    </Flex>
    </>)
}

export default Chat