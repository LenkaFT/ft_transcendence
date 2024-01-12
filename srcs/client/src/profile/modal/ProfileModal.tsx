import React, { useEffect, useState } from "react"
import {
    Button,
    Box,
    Avatar,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalBody,
    ModalFooter,
    Text,
    Flex,
    useToast
  } from '@chakra-ui/react'
import * as Constants from '../../game/globals/const'
import authService from "../../auth/auth.service";
import { LeftBracket, RightBracket } from "../../game/game-creation/Brackets";
import PlayerHistoryAccordion from "./PlayerHistoryAccordion";
import { Socket } from "socket.io-client";
import BasicToast from "../../toast/BasicToast";




function ProfileModal(props : {userId : string, isOpen : boolean, onOpen : () => void , onClose : () => void, gameSock : Socket, chatSocket: Socket}) {

    const [user, setUser] = useState<any>(null);
    const [isYourself, setIsYoursellf] = useState(false);
    const [friendRequestStatus, setFriendRequestStatus] = useState('undefined')
    const [isFriendRequestCreator, setIsFriendRequestCreator] = useState(false)
    const [friendRequestId, setFriendRequestId] = useState(0)
    const [isBlocked, setIsBlocked] = useState(false);
    const toast = useToast();

    function sendDuelInvite(gameType : string) {
        props.gameSock?.emit('gameInvite', {targetId : props.userId, gameType : gameType})
    }
    
    function sendPrivateMessage(){
        props.chatSocket?.emit('DM', {targetId: props.userId})
        props.onClose()
    }



    async function blockThem(targetId: string){
        try{
            const res = await authService.post(process.env.REACT_APP_SERVER_URL + '/users/block/' + targetId, {})
            setIsBlocked(true)
            const id = 'block-toast'
            if (!toast.isActive(id)){
                const status = `${res.data} has been blocked.`
                toast({
                    id,
                    duration: 5000,
                    render : () => ( <> 
                        <BasicToast text = {status}/>
                    </>)
                    })
            }
            props.chatSocket?.emit('triggerRerenderMessage')
            props.onClose()
        }
        catch(err){
            if (err.response?.status === 409)
            {
                toast({
                    duration: 5000,
                    render : () => ( <> 
                        <BasicToast text = {err.response?.data?.error}/>
                    </>)
                })
            }
            else
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }
    
    const handleUnblocked = (data : {username: string, username2: string}) => {
        setIsBlocked(false);
        const id = 'unblock-toast'
        if (!toast.isActive(id)){
            const status = `${data.username2} has been unblocked.`
            toast({
                id,
                duration: 5000,
                render : () => ( <>
                    <BasicToast text = {status}/>
                </>)
              })
        }
      };
      
    function unBlockThem(targetId: string){
        props.chatSocket?.emit('unblock', { targetId })
        props.onClose()
        props.chatSocket?.on('unblocked', (data) => {        
            handleUnblocked(data)
        })
        return () => {
            props.chatSocket?.off('unblocked', handleUnblocked)
        };
    }

    async function addFriend(userId: string) {
        try {
            const res = await authService.post(process.env.REACT_APP_SERVER_URL + `/users/friendRequest/send/${userId}`, {});
            
            props.chatSocket?.emit('friendRequestSended', {creatorId: res.data.receiver.id})
            setFriendRequestStatus('pending')
            setIsFriendRequestCreator(true)
        } catch(err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    async function acceptFriend() {
        try {
            const res = await authService.patch(process.env.REACT_APP_SERVER_URL + `/users/friendRequest/response/${friendRequestId}`, {status:'accepted'});
            props.chatSocket?.emit('friendRequestAccepted', {creatorId: res.data.creator.id})
            props.chatSocket?.emit('friendRequestAccepted', {creatorId: res.data.receiver.id})
            setFriendRequestStatus('accepted')
            setIsFriendRequestCreator(false)

        } catch(err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    async function removeFriend() {
        try {
            const res = await authService.patch(process.env.REACT_APP_SERVER_URL + `/users/friendRequest/remove/${friendRequestId}`, {status:'undefined'});

            props.chatSocket?.emit('friendRemoved', {creatorId: res.data.creator.id})
            props.chatSocket?.emit('friendRemoved', {creatorId: res.data.receiver.id})

            setFriendRequestStatus('undefined')
            setIsFriendRequestCreator(false)

        } catch(err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }


    useEffect(() => {
        
        if (!props.userId)
            return ;
        const checkIfYourself = async (userId : string) => {
            try {
                const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/auth/validate');
                if (userId == res?.data?.id)
                {
                    setIsYoursellf(true);
                }
                else
                    setIsYoursellf(false)
            }
            catch(error) {
                if (error)
                    console.error('Error checking if profile is my own:', error);
            }
        }
        const fetchUserProfile = async () => {
            try {
                const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/users/profile/' + props.userId);
                setUser(res?.data);

                return (res?.data?.id)
            } catch (err) {
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        }

    
        fetchUserProfile().then((userId) => {
            checkIfYourself(userId);
            
        });


    }, [props.userId])

    const fetchFriendStatus = async (userId: string) => {
        if (isYourself || !props.userId)
            return

        try {
            const res = await authService.get(process.env.REACT_APP_SERVER_URL + `/users/friendRequest/${userId}`);
            setFriendRequestStatus(res.data?.status)
            setIsFriendRequestCreator(res.data?.isCreator)
            setFriendRequestId(res.data?.id)
        } catch (err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    const fetchBlockStatus = async (userId: string) => {
        if (isYourself || !props.userId)
            return

        try {
            const res = await authService.get(process.env.REACT_APP_SERVER_URL + `/users/isBlocked/${userId}`);
            setIsBlocked(res.data);
        } catch (err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    useEffect(() => {
        fetchFriendStatus(props.userId);
        fetchBlockStatus(props.userId);
    })
    
    useEffect(function socketEvent() {

        props.gameSock?.on('closeModal', () => {
            props.onClose();
        })

        props.chatSocket?.on('friendRequestSendedModal', () => {
            setFriendRequestStatus('pending')
            setIsFriendRequestCreator(false)
        })

        props.chatSocket?.on('friendRequestAcceptedModal', () => {
            setFriendRequestStatus('accepted')
            setIsFriendRequestCreator(false)
        })
 
        props.chatSocket?.on('friendRemovedModal', () => {
            setFriendRequestStatus('undefined')
            setIsFriendRequestCreator(false)
        })

        return (() => {
            props.gameSock?.off('closeModal');
            props.chatSocket?.off('friendRequestSendedModal');
            props.chatSocket?.off('friendRequestAcceptedModal');
            props.chatSocket?.off('friendRemovedModal');
        })
    }, [props.chatSocket, friendRequestStatus,isFriendRequestCreator])

    if (!props.userId)
        return ;

    return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered={true}>
        <ModalOverlay
          bg='blackAlpha.300'
          backdropFilter='blur(10px)'
        />
        <ModalOverlay />
            <ModalContent borderRadius={'0px'} bg={Constants.BG_COLOR_FADED} textColor={'white'} className="goma"
            paddingTop={'10px'} paddingBottom={'10px'}>
                <Box display={'flex'} flexDir={'row'}
                alignContent={'left'}
                alignItems={'center'}
                justifyContent={'center'}
                width={'448px'}
                marginBottom={'20px'}
                >
                    <LeftBracket w={'16px'} h={'42px'} girth={'6px'} marginRight="-4px"/>
                        <Text fontWeight={'normal'} textAlign={'center'} padding={'0px'} fontSize={'2em'}
                        > 
                            {user?.username} 
                        </Text>
                    <RightBracket w={'16px'} h={'42px'} girth={'6px'} marginLeft="-4px"/>
                </Box>

                <ModalBody display={'flex'} flexDir={'row'} padding={'8px'}>
                    <Box width={'128px'} height={'128px'} marginBottom={'15px'}>
                        <Avatar
                        size='2xl'
                        name={user?.username}
                        src={process.env.REACT_APP_SERVER_URL + '/users/avatar/' + props.userId}
                        marginRight={'10px'}
                        >
                        </Avatar>
                    </Box>

                    <Box width={'128px'} 
                    display={'flex'} flexDir={'column'}
                    alignContent={'left'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    marginBottom={'15px'}
                    >
                        <Text textAlign={'center'} fontSize={'2em'}> WINS </Text>
                        <Text textAlign={'center'} fontSize={'2em'}> {user?.winsAmount} </Text>
                    </Box>
                    <Box width={'128px'} 
                    display={'flex'} flexDir={'column'}
                    alignContent={'left'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    marginBottom={'15px'}
                    >
                        <Text textAlign={'center'} fontSize={'2em'}> LOOSES </Text>
                        <Text textAlign={'center'} fontSize={'2em'}> {user?.loosesAmount} </Text>
                    </Box>

                </ModalBody>

                <Flex w={'448px'} h={'160px'} wrap={'wrap'} flexDir={'row'}
                alignContent={'center'}
                alignItems={'center'}
                justifyContent={'center'}
                justifyItems={'center'}
                >
                    <Box minW={'224px'} h={'80px'}
                    display={'flex'}
                    justifyContent={'center'}
                    alignItems={'center'}>
                        <Button colorScheme='none'
                        fontWeight={'normal'}
                        borderRadius={'none'}
                        _hover={{background : 'white', textColor: 'black'}}
                        isDisabled={isYourself}
                        textAlign={'center'}
                        onClick={() => (sendPrivateMessage())}
                        >
                            MESSAGE THEM
                        </Button>
                    </Box>

                    <Box  minW={'224px'} h={'80px'}
                    display={'flex'}
                    justifyContent={'center'}
                    alignItems={'center'}>
                        <Button colorScheme='none'
                        fontWeight={'normal'}
                        borderRadius={'none'}
                        _hover={{background : 'white', textColor: 'black'}}
                        onClick={() => (sendDuelInvite(Constants.GAME_TYPE_ONE))}
                        isDisabled={isYourself}
                        textAlign={'center'}
                        >
                            {Constants.GAME_TYPE_ONE.toLocaleUpperCase()} DUEL
                        </Button>
                    </Box>

                    {!isBlocked && <Box w={'224px'} h={'80px'} 
                    display={'flex'}
                    justifyContent={'center'}
                    alignItems={'center'}>
                        <Button colorScheme='none'
                        fontWeight={'normal'}
                        borderRadius={'none'}
                        _hover={{background : 'white', textColor: 'black'}}
                        onClick={() => (blockThem(props.userId))}
                        isDisabled={isYourself}
                        >
                             BLOCK THEM
                        </Button>
                    </Box>}

                    {isBlocked && <Box w={'224px'} h={'80px'} 
                    display={'flex'}
                    justifyContent={'center'}
                    alignItems={'center'}>
                        <Button colorScheme='none'
                        fontWeight={'normal'}
                        borderRadius={'none'}
                        _hover={{background : 'white', textColor: 'black'}}
                        onClick={() => (unBlockThem(props.userId))}
                        isDisabled={isYourself}
                        >
                             UNBLOCK THEM
                        </Button>
                    </Box>}

                    <Box w={'224px'} h={'80px'} 
                    display={'flex'}
                    justifyContent={'center'}
                    alignItems={'center'}>
                        <Button colorScheme='none'
                        fontWeight={'normal'}
                        borderRadius={'none'}
                        _hover={{background : 'white', textColor: 'black'}}
                        onClick={() => (sendDuelInvite(Constants.GAME_TYPE_TWO))}
                        isDisabled={isYourself}
                        >
                            {Constants.GAME_TYPE_TWO.toLocaleUpperCase()} DUEL
                        </Button>
                    </Box>

                    <Box w={'224px'} h={'80px'} 
                    display={'flex'}
                    justifyContent={'center'}
                    alignItems={'center'}>

                    {!isYourself && friendRequestStatus === 'accepted' && 
                        <Button colorScheme='none'
                        fontWeight={'normal'}
                        borderRadius={'none'}
                        _hover={{background : 'white', textColor: 'black'}}
                        onClick={() => (removeFriend())}
                        isDisabled={isYourself}
                        >
                            REMOVE FRIEND
                        </Button>
                    }

                    { !isYourself && (friendRequestStatus === 'undefined') &&
                        <Button colorScheme='none'
                        fontWeight={'normal'}
                        borderRadius={'none'}
                        _hover={{background : 'white', textColor: 'black'}}
                        onClick={() => (addFriend(user.id))}
                        isDisabled={isYourself}
                        >
                            ADD FRIEND
                        </Button>
                    }
                    {!isYourself && friendRequestStatus === 'pending' && isFriendRequestCreator &&
                        <div>
                            Friend request pending...
                        </div>
                    }
                    {!isYourself && friendRequestStatus === 'pending' && !isFriendRequestCreator &&
                        <>
                            <Box>
                                <Button colorScheme='none'
                                fontWeight={'normal'}
                                borderRadius={'none'}
                                _hover={{background : 'white', textColor: 'black'}}
                                onClick={() => (acceptFriend())}
                                isDisabled={isYourself}
                                >
                                    ACCEPT FRIENDSHIP
                                </Button>
                            </Box>

                            <Box>
                                <Button colorScheme='none'
                                fontWeight={'normal'}
                                borderRadius={'none'}
                                _hover={{background : 'white', textColor: 'black'}}
                                onClick={() => (removeFriend())}
                                isDisabled={isYourself}
                                >
                                    DENY FRIENDSHIP
                                </Button>
                            </Box>
                        </>

                        
                }
                    </Box>


                </Flex>
                <PlayerHistoryAccordion userId={user?.id} gameSocket={props.gameSock} chatSocket={props.chatSocket}/>

            </ModalContent>
    </Modal>);
}

export default ProfileModal