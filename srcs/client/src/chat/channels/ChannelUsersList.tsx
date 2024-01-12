import { Button, Flex, useToast } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import authService from "../../auth/auth.service";
import BasicToast from "../../toast/BasicToast";
import BanList from "./BanList";
import ChannelSettings from "../channels-settings/ChannelSettings";
import UserInUsersList from "./UserInUsersList";
import { Room } from "../interfaces/interface";

function ChannelUsersList(props : {room : Room, chatSocket : Socket, gameSocket : Socket, setTargetChannel : Function}) {

    const [isOp, setIsOp] = useState(false)
    const toast = useToast();
    const [listToDisplay, setListToDisplay] = useState('users')
    const [rerender, setRerender] = useState(false)
    const [userList, setUserList] = useState
    <{
        id: string, 
        username: string
    }[]>([]);
    const [me, setMe] = useState<
    {
        id: string, 
        username: string
    } | undefined>(undefined);
    const [banList, setBanList] = useState
    <{
        id: string, 
        username: string
    }[]>([]);

    async function getUserList(roomId: number, me : {username: string, id: string}){
        let userlist : {
            id : string,
            username: string
        }[]
        try{
            const users =  await authService.get(process.env.REACT_APP_SERVER_URL + '/room/userlist/' + roomId)
            userlist = users.data
            userlist = userlist.filter(user => user.id !== me?.id)
        }
        catch(err){
            if (err.response?.data)
              console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
        return (userlist);
    }
 
    const fetchUserList = async (me : {username: string, id: string}) => {
        try {
            const array = await getUserList(props.room.id, me)
            setUserList(array)
        }
        catch(err){
            if (err.response?.data)
              console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    const fetchBanList = async (roomId : number) => {
        try {
          const bannedUsersArray = await authService.get(process.env.REACT_APP_SERVER_URL + '/room/bannedList/' + roomId)
          setBanList(bannedUsersArray.data);
        }
        catch(err) {
          if (err.response?.data)
            console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    useEffect(() => {
        
        async function asyncWrapper() {
            try{
                const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/auth/validate')
                setMe({id: res?.data?.id, username: res?.data?.username})
                await fetchUserList(res.data)
                await fetchBanList(props.room?.id);

                const privi = await authService.post(process.env.REACT_APP_SERVER_URL + '/room/userPrivileges',
                {targetId : res.data.id, roomId : props.room?.id})
                if (privi.data === 'isAdmin' || privi.data === 'isOwner')
                  setIsOp(true);
                else
                  setIsOp(false);
            }
            catch(err){
              if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        }

        asyncWrapper();
    }, [rerender, props.room])

    useEffect(function sockEvents() {

        function forceRender(roomId? : number) {
          
          if (roomId && roomId !== props.room.id)
            return ;
          if (rerender === true)
            setRerender(false)
          else if (rerender === false)
            setRerender(true);

          
        };

        props.chatSocket?.on('channelUpdate', (roomId) => forceRender(roomId));
  
        props.chatSocket?.on('userJoined', (roomId) => forceRender(roomId));

        props.chatSocket?.on('userLeft', (roomId) => forceRender(roomId));

        props.chatSocket?.on('timeoutEnd', (roomId) => forceRender(roomId));
  
        props.chatSocket?.on('youGotBanned', (roomName) => {
          
          const id = 'test-toast';
          if(!toast.isActive(id)) {
            toast({
              id,
              isClosable: true,
              duration : 5000,
              render : () => ( <> 
                <BasicToast text={'you got banned from ' + roomName}/>
            </>)
            })
          }
        });
        
        return (() => {
          props.chatSocket?.off('channelUpdate');
          props.chatSocket?.off('userJoined');
          props.chatSocket?.off('userleft');
          props.chatSocket?.off('youGotBanned');
          props.chatSocket?.off('timeoutEnd');
        })
      }, [props.chatSocket, props.room, rerender])

    return (<>
        <Flex 
        width={'100%'}
        height={'100%'}
        flexDir={'row'}
        alignItems={'center'}
        >
          {isOp && <>
            <Flex h={'100%'}
            width={'10%'}
            minW={'64px'}
            flexDir={'column'}
            >
              <Button onClick={() => {setListToDisplay('users')}}
              h={'50%'}
              w={'100%'}
              borderRadius={'0px'}
              bg={'none'}
              textColor={'white'}
              fontWeight={'normal'}
              border={listToDisplay === 'users' ? '1px solid white' : 'none'}
              _hover={{bg: 'white', textColor : 'black', transform : 'scale(1)'}}
              > 
                USERS
              </Button>

              <Button onClick={() => {setListToDisplay('bans')}}
              h={'50%'}
              w={'100%'}
              borderRadius={'0px'}
              bg={'none'}
              textColor={'white'}
              fontWeight={'normal'}
              border={listToDisplay === 'bans' ? '1px solid white' : 'none'}
              _hover={{bg: 'white', textColor : 'black', transform : 'scale(1)'}}
              >
                BANS
              </Button>
            </Flex>
            <Flex h={'100%'} w={'80%'} minW={'224px'} padding={'10px'}
            overflowY={'auto'} flexDir={'row'} wrap={'wrap'}>
                {listToDisplay === 'users' && <>
                  {userList.map((user, index) => {
                    
                    return (
                      <Flex key={index}
                      h={'50%'}
                      padding={'10px'}
                      alignItems={'center'}>
                            <UserInUsersList 
                            username={user.username}
                            userId={user.id} 
                            room={props.room} 
                            userIsOp={isOp} 
                            chatSock={props.chatSocket}
                            gameSock={props.gameSocket}/>
                        </Flex>)
                  })}
                </>
                }
                {listToDisplay === 'bans' && <BanList banList={banList} room={props.room} chatSock={props.chatSocket}/>}
              </Flex>
            
            <Flex
              height={'100%'}
              width={'10%'}
              minW={'32px'}
              justifyContent={'right'}
            >
              <ChannelSettings chatSocket={props.chatSocket} room={props.room} isOp={isOp} setTargetChannel={props.setTargetChannel}/>
            </Flex>
          </>
          }

          {!isOp && <>
          <Flex width={'90%'}
          height={'100%'}
          minW={'288px'}
          overflowY={'auto'} 
          flexDir={'row'} 
          wrap={'wrap'}
          alignItems={'normal'}
          >
              {userList.map((user, index) => {
                
                return (
                  <Flex key={index}
                  h={'50%'}
                  padding={'10px'}
                  alignItems={'center'}>
                      <UserInUsersList 
                      username={user.username}
                      userId={user.id} 
                      room={props.room} 
                      userIsOp={isOp} 
                      chatSock={props.chatSocket}
                      gameSock={props.gameSocket}/>
                  </Flex>)
              })}
            </Flex>

            <Flex
            height={'100%'}
            width={'10%'}
            minW={'32px'}
            justifyContent={'right'}
            >
              <ChannelSettings chatSocket={props.chatSocket} room={props.room} isOp={isOp} setTargetChannel={props.setTargetChannel}/>
            </Flex>
            </>
            }
        </Flex>
    </>);
};

export default ChannelUsersList