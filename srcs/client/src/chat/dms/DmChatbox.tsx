import { ArrowRightIcon } from "@chakra-ui/icons";
import { Avatar, Button, Flex, FormControl, Input, Link, Text, WrapItem, useDisclosure, useToast } from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Socket } from "socket.io-client";
import authService from "../../auth/auth.service";
import * as Constants from '../../game/globals/const';
import ProfileModal from "../../profile/modal/ProfileModal";
import BasicToast from "../../toast/BasicToast";
import { MessageData, Room } from "../interfaces/interface";

import { decode } from "html-entities";

function timeOfDay(timestampz: string | Date){
    const dateObj = new Date(timestampz)
    let hour = dateObj.getHours()
    let min =  dateObj.getMinutes()
    let day = dateObj.getDay()
    let month = dateObj.getMonth()
    let year = dateObj.getFullYear()
    let tmp = ""
    let tmp2 = ""
    if (min < 10)
        tmp = "0" + min.toString()
    else
        tmp = min.toString()
    if (day < 10)
        tmp2 = "0" + day.toString()
    else
        tmp2 = day.toString()
    let date = hour.toString() + ":" + tmp + " " + tmp2 + "/" + month + "/" + year
    return (date)
}

function DmRoom(props : {room : Room, chatSocket : Socket, gameSocket : Socket}) {
    const [messageList, setMessageList] = useState<MessageData[]>([]);
    const [rerenderMsg, setRerenderMsg] = useState('')
    const scrollToBottomRef = useRef<HTMLDivElement>(null);
    const [id, setId] = useState("");
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const [them, setThem] = useState<
    {
        id: string, 
        username: string
    } | undefined>(undefined);
    const [me, setMe] = useState<
    {
        id: string, 
        username: string
    } | undefined>(undefined);
    const { 
    register, 
    handleSubmit, 
    setValue, 
    formState: { errors }} = useForm();

    const onSubmit = (data: {message: string}) => {
        sendMessage(data.message)
        setValue('message', '')
    }

    const sendMessage = async (currentMessage: string) => {
        try {
            const res = await authService.post(process.env.REACT_APP_SERVER_URL + '/room/message', 
            {
              roomId: props.room.id, 
              content: currentMessage, 
            })
            const message = res.data;
            props.chatSocket.emit("sendMessage", message)
            setMessageList((list) => [...list, message])
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
            if (err.response?.status === 413 || err.response?.status === 400)
            {
                toast({
                    duration: 5000,
                    render : () => ( <> 
                      <BasicToast text='Invalid message'/>
                  </>)
                  })
            }
            else
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }


    const rerenderMessage = async () => {
        try{
            const room = await authService.get(process.env.REACT_APP_SERVER_URL + '/room/messageInRoom/' + props.room.id)
            setMessageList(room.data.message)
        }
        catch(err){
            if (err){
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        }
    }

    useEffect(() => {
        props.chatSocket?.on('rerenderMessage', () => {
            rerenderMessage()
        })
        
        return (() => {
            props.chatSocket?.off('rerenderMessage')
        })
    })

    useEffect(() => {
        props.chatSocket?.on("receiveMessage", (data: MessageData) => {

        if (data.room.id === props.room.id)
        {
            setMessageList((list) => [...list, data])
        }
        })
        return (() => {
            props.chatSocket?.off("receiveMessage")
        })
    }, [props.room])

    function trimDashes(str : string) {
        return str.at(0) === '-' ? str.substring(1) : str.substring(0, str.length - 1)
    }

    useEffect(() => {
      
        const asyncWrapper = async () => {
            try{
                const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/auth/validate')
                setMe({id: res?.data?.id, username: res?.data?.username})
                const themRes = await authService.get(process.env.REACT_APP_SERVER_URL + '/users/' + trimDashes(props.room?.name.replace(res.data.id, '')))
                setThem(themRes.data);
            }
            catch(err){
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)} 
        }

        setMessageList(props.room.message ? props.room.message : []);
        asyncWrapper();
    }, [props.room])


    useEffect(() => {

        if (scrollToBottomRef.current) {
            scrollToBottomRef.current.scrollTop = scrollToBottomRef.current.scrollHeight;
          }
    }, [messageList])

    return (<>
        <Flex h={'100%'}
        flexDir={'column'}
        width={'100%'}
        >
            <Flex w={'100%'}
            h={'10%'}
            minH={'80px'}
            alignItems={'center'}
            bg={Constants.BG_COLOR_LESSER_FADE}
            >
                <Avatar
                boxSize={'76px'}
                name={them?.username}
                src={them !== undefined ? process.env.REACT_APP_SERVER_URL + '/users/avatar/' + them?.id : ''}
                margin={'10px'}
                > </Avatar>
                <Text margin={'10px'}> {them?.username} </Text>
            </Flex>
            
            <Flex 
            width={'100%'}
            h={'80%'}
            flexDir={'column'}
            overflowY={'auto'}
            overflowX={'hidden'}
            ref={scrollToBottomRef}
            >
                    {messageList.map((messageContent, index) => {

                    return (
                        <Flex key={index}
                        w={'100%'}
                        bg='none'
                        padding={'10px'}
                        textColor={'white'}
                        wrap={'wrap'}
                        justifyContent={messageContent.author?.id === me?.id ? "right" : "left"}>
                                <Flex 
                                maxWidth={'70%'}
                                bg={Constants.BG_COLOR_LESSER_FADE}
                                flexDir={'column'}
                                wrap={'wrap'}
                                padding={'10px'}
                                wordBreak={'break-all'}
                                >   
                                    <Flex
                                    flexDir={'row'}
                                    marginBottom={'4px'}
                                    justifyContent={'space-evenly'}
                                    alignItems={'center'}
                                    >
                                        <Avatar 
                                        size='sm'
                                        name={messageContent.author?.username}
                                        src={process.env.REACT_APP_SERVER_URL + '/users/avatar/' + messageContent.author?.id}
                                        />
                                        
                                        <Text padding={'10px'} >{decode(messageContent.content)}</Text>
                                        
                                    </Flex>
                                    <Link fontSize={'0.6em'}onClick={() => { onOpen(); setId(messageContent.author?.id) }}>{messageContent.author?.username}</Link>
                                
                                </Flex>
                                <WrapItem
                                padding={'5px'}
                                fontSize={'0.6em'}
                                flexDir={'row'}
                                justifyContent={messageContent.author?.id === me?.id ? "right" : "left"}
                                width={'100%'}                            
                                >
                                    <Text>{timeOfDay(messageContent.sendAt)} </Text>
                                </WrapItem>
                        </Flex>)
                  })}
            </Flex>

            <Flex w={'100%'}
            h={'10%'}
            minH={'80px'}
            flexDir={'row'}
            justifyContent={'center'}
            alignItems={'center'}
            bg={Constants.BG_COLOR_LESSER_FADE}
            >
                <form onSubmit={handleSubmit(onSubmit)} style={
                    {
                        width : '100%',
                        height : '100%',
                        display: 'flex',
                        flexDirection : 'row',
                        justifyContent : 'space-evenly',
                        alignItems : 'center'
                    }
                }>
                    <FormControl isRequired
                    w={'80%'}
                    h={'60px'}>
                        <Input
                            h={'60px'}
                            border={'none'}
                            focusBorderColor="none"
                            borderRadius={'0px'}
                            type='text'
                            autoComplete="off"
                            placeholder="type your message..."
                            {...register("message", {
                                required: "enter message",
                            })}
                        />
                    </FormControl>

                    <Button 
                    type='submit'
                    borderRadius={'0px'}
                    bg={'none'}
                    _hover={{background : 'none', transform: 'scale(1.4)'}}
                    >
                        <ArrowRightIcon boxSize={4} color={'white'}/>
                    </Button>
              </form>
            </Flex>
        </Flex>
        <ProfileModal userId={id} isOpen={isOpen} onClose={onClose} onOpen={onOpen}
        chatSocket={props.chatSocket} gameSock={props.gameSocket}/>
    </>)
}

export default DmRoom