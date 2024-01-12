import { LockIcon, SearchIcon } from "@chakra-ui/icons"
import {
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Tooltip,
  useColorMode,
  useDisclosure,
  useToast
} from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { Socket } from "socket.io-client"
import authService from "../../auth/auth.service"
import * as Constants from '../../game/globals/const'
import BasicToast from "../../toast/BasicToast"
import ChannelPasswordModal from "../channel-creation/ChannelPasswordModal"
import { Room } from "../interfaces/interface"


async function getRoomList(){
    let roomList: { 
        id: number 
        name: string 
        password : 'isPasswordProtected' | 'none',
        privChan: string | null }[]
    try{
        const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/room/list')
        roomList = res.data
    }
    catch(err){
      if (err.response?.data)
        console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
    }
    return roomList
}

function ChannelList(props: {chatSocket: Socket, setTargetRoom : Function, targetRoom : Room}){
    const { isOpen, onOpen, onClose } = useDisclosure()
    const toast = useToast()
    const [roomName, setRoomName] = useState<string>()
    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)
    const [roomnamesNarrower, setRoomnamesNarrower] = useState('')
    const [roomList, setRoomList] = useState
    <{  id: number
        name: string
        password: 'isPasswordProtected' | 'none',
        privChan: string | null }[]>([])

      const  joinRoom = async (dt: {room: string, password: string}) => {
        try{
            const res = await authService.post(process.env.REACT_APP_SERVER_URL + '/room/joinRoom',
            {
                name: dt.room,
                password: dt.password
            })
            props.chatSocket?.emit("joinRoom", res.data.id);
            props.setTargetRoom(res.data);
        }
        catch(err){

            if (err.response?.status === 409 || err.response?.status === 403 || err.response?.status === 404)
            {
                toast({
                    isClosable: true,
                    duration : 5000,
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

    const fetchRoom = async () => {
        const rooms = await getRoomList()

        if (roomnamesNarrower === '')
          setRoomList(rooms);
        else (setRoomList(() => {
          return (rooms.filter((room) => room.name.toLocaleLowerCase().includes(roomnamesNarrower.toLocaleLowerCase())));
        }))
    }
    
    useEffect(() => {
        fetchRoom()
    }, [])

    useEffect(function socketEvents() {

      props.chatSocket?.on('channelCreated', () => {
        fetchRoom();
      });

      props.chatSocket?.on('channelStatusUpdate', () => {

        fetchRoom();
      })

      return (() => {
        props.chatSocket?.off('channelCreated');
        props.chatSocket?.off('channelStatusUpdate');
      })
    }, [props.chatSocket])

    useEffect(() => {
      fetchRoom()
    }, [roomnamesNarrower])

    useEffect(() => {

      props.chatSocket?.on('chanInvitedNotification', ({senderId, senderUsername, roomName, roomId, targetId}) => {
        const id = 'invite-toast'
        if(!toast.isActive(id)) {
        toast({
          id,  
          duration: null,
          render : () => ( <>
            <BasicToast text={'You just got invited by ' + senderUsername  + ' to join ' + roomName + ' !'}>
                <Button onClick={() => {
                    props.chatSocket?.emit('declinedInviteChan', {roomName, targetId, senderId})
                    toast.closeAll()}
                }
                bg={'none'}
                borderRadius={'0px'}
                fontWeight={'normal'}
                textColor={'white'}
                _hover={{bg: 'white', textColor : Constants.BG_COLOR_FADED}}
                > 
                NO THANKS
                </Button>
                <Button onClick={() => {
                    props.chatSocket?.emit('acceptedInviteChan', {roomId: roomId, roomName: roomName, targetId: targetId})
                    toast.closeAll()
                }}
                bg={'none'}
                borderRadius={'0px'}
                fontWeight={'normal'}
                textColor={'white'}
                _hover={{bg: 'white', textColor : Constants.BG_COLOR_FADED}}
                >
                  YES PLEASE 
                </Button>
              </BasicToast>
            </>
          ),
          isClosable: true,
        })
      }
      })  
      props.chatSocket?.on('declinedNotification', (username: string) => {
          const id = 'declined-toast';
          if(!toast.isActive(id)){
            toast({
              id,
              isClosable: true,
              duration : 5000,
              render : () => ( <>
                <BasicToast text={`${username} declined your invitation `}/>
            </>)
            })
          }
        })

      props.chatSocket?.on('signalForJoinRoom', (roomName: string) => {
        joinRoom({room: roomName, password: null})
      })
      return (() => {
        props.chatSocket?.off('declinedNotication')
        props.chatSocket?.off('chanInvitedNotification')
        props.chatSocket?.off('signalForJoinRoom')
      })
    })

    function handleChange(event : React.ChangeEvent<HTMLInputElement>) {
      setRoomnamesNarrower(event.target.value)
    }

    async function isUserInRoom(roomId : number, roomName : string, password: 'isPasswordProtected' | 'none', isPrivChan : string) {
      try {
        const isInRoom = await authService.get(process.env.REACT_APP_SERVER_URL + '/room/isInRoom/' + roomId);
        if (isInRoom.data === false && password === 'isPasswordProtected') {
          onOpen()
          setRoomName(roomName)
        }
        else if (isInRoom.data === false && !isPrivChan && password === 'none')
          joinRoom({room : roomName, password : null})
        else if (isInRoom.data === false && isPrivChan)
          joinRoom({room : roomName, password : null})
        else{
          const room = await authService.get(process.env.REACT_APP_SERVER_URL + '/room/messageInRoom/' + roomId)
          props.setTargetRoom(room.data)
        }
      }
      catch(err) {
        if (err.response?.data)
          console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
      }
    }

    return (
        <>
          <Flex
            w={'100%'}
            bg={Constants.BG_COLOR}
            padding={'10px'}
            wrap={'nowrap'}
            flexDir={'column'}
          >
            <Text w={'100%'} textAlign={'center'} marginBottom={'10px'}>
              CHANNEL LIST
            </Text>

            <InputGroup>
              <InputLeftElement pointerEvents='none'>
                <SearchIcon color='gray.300' />
              </InputLeftElement>
              <Input value={roomnamesNarrower} onChange={handleChange}
              marginBottom={'10px'}
              focusBorderColor="black"
              _focus={{bg : 'white', textColor : 'black'}}
              />
            </InputGroup>
            <Flex
              w={'100%'}
              padding={'10px'}
              wrap={'nowrap'}
              flexDir={'column'}
              overflowY={'auto'}
            >
              {roomList?.length > 0 && (
                roomList.map((room, index: number) => {
                  let state: string
                  if (room?.privChan) state = 'private'
                  else if (room?.password === 'isPasswordProtected') state = 'password'
                  else state = 'default'
                  return (
                    <Flex
                      key={room.id}
                      border={room.name === props.targetRoom?.name ? '1px solid white' : 'none'}
                      width={'100%'}
                      minH={'45px'}
                      marginBottom={'10px'}
                      padding={'4px'}
                      flexDir={'column'}
                      alignItems={'center'}
                      _hover={{ background: 'white', textColor: Constants.BG_COLOR }}
                      bgColor={Constants.BG_COLOR_FADED}
                      onClick={() => {
                        isUserInRoom(room.id, room.name, room.password, room.privChan);
                      }}
                      onMouseEnter={() => setHoveredRoom(room.name)}
                      onMouseLeave={() => setHoveredRoom(null)}
                    >
                      <Flex w={'100%'} h={'60px'} flexDir={'row'} alignItems={'center'} textOverflow={'ellipsis'}>
                      {state === 'password' && (<LockIcon boxSize={4} color={hoveredRoom === room.name ? 'black' : 'white'} marginRight={'5px'}/>)}
                      {state !== 'password' && (<Text fontWeight={'bold'} marginRight={'8px'}> # </Text>)}
                        <Tooltip label={room.name}>
                          <Text as={'b'}>
                            {room.name.length < 20 ? room.name : room.name.substring(0, 17) + '...'}{' '}
                          </Text>
                        </Tooltip>
                      </Flex>
                    </Flex>
                  )
                })
              )}
            </Flex>
          </Flex>
          <ChannelPasswordModal
            setTargetRoom={props.setTargetRoom}
            roomName={roomName}
            isOpen={isOpen}
            onClose={onClose}
            onOpen={onOpen}
            chatSocket={props.chatSocket}
          />
        </>
      )
    }
    
    

export default ChannelList

