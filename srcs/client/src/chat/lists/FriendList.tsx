import { CheckCircleIcon, EmailIcon } from "@chakra-ui/icons";
import { Box, Flex, Link, Text, useDisclosure } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import authService from "../../auth/auth.service";
import * as Constants from '../../game/globals/const';
import ProfileModal from "../../profile/modal/ProfileModal";

function FriendList(props: {chatSocket: Socket, gameSocket : Socket}) {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [id, setId] = useState("")

    const [friendsList, setFriendsList] = useState<{
        username : string,
        id : string,
        isLogged? : boolean, 
        isAvailable : boolean
      }[]>([]);

    const [pendingRequestList, setPendingRequestList] = useState<{
    creatorId: string,
    creatorName: string,
    }[]>([]);
    async function fetchFriends() {
        let friendsList: {
            username: string,
            id: string,
            isLogged?: boolean,
            isAvailable: boolean
        }[]

        try {
            const res = await authService.get(`${process.env.REACT_APP_SERVER_URL}/users/friends/all`)
            setFriendsList(res?.data)

            const requests = await authService.get(`${process.env.REACT_APP_SERVER_URL}/users/friends/allRequests`)
            setPendingRequestList(requests?.data);
        } catch(err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
        return friendsList
    }      

    function openProfileModal(userId : string) {
        setId(userId);
        onOpen();
    }

    useEffect(function socketEvent() {

        props.chatSocket?.on('friendRequestSendedChat', () => {
            fetchFriends()
        })

        props.chatSocket?.on('friendRequestAcceptedChat', () => {
            fetchFriends()
        })
 
        props.chatSocket?.on('friendRemovedChat', () => {
            fetchFriends()
        })

        return (() => {
            props.chatSocket?.off('friendRequestSendedChat');
            props.chatSocket?.off('friendRequestAcceptedChat');
            props.chatSocket?.off('friendRemovedChat');
        })
    }, [props.chatSocket])

    useEffect(() => { 
        fetchFriends()
    }, [props.chatSocket])

    useEffect(function socketEvents() {

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

        const debouncedFetchFriend = debounce(fetchFriends, 500);

        props.gameSocket?.on('friendListUpdate', debouncedFetchFriend);

        return(() => {
            props.gameSocket?.off('friendListUpdate');
        });
    }, [props.gameSocket])

    useEffect(() => {
        fetchFriends();

    }, [])


    return (<>
            <Flex h={'50%'}
            w={'100%'}
            bg={Constants.BG_COLOR}
            padding={'10px'}
            wrap={'nowrap'}
            flexDir={'column'}
            overflowY={'auto'}
            >

            <Text w={'100%'} textAlign={'center'} marginBottom={'10px'}> FRIENDS LIST </Text>
            <Flex
            w={'100%'}
            bg={Constants.BG_COLOR}
            wrap={'nowrap'}
            flexDir={'column'}
            overflowY={'auto'}
            >
                {pendingRequestList && pendingRequestList?.map((request, index) => {
                    if (!request)
                        return
                    return (
                        <Flex key={(index)}
                        width={'100%'} 
                        minH={'66px'}
                        marginBottom={'10px'}
                        flexDir={'column'} 
                        alignItems={'center'}
                        justifyContent={'center'}
                        bgColor={Constants.BG_COLOR_FADED}
                        > 
                            <Text>
                                Friend request from
                                <Link 
                                overflow={'hidden'} 
                                textOverflow={'ellipsis'} 
                                onClick={() => {openProfileModal(request?.creatorId)}}>
                                     {' ' + request?.creatorName}
                                </Link>
                            </Text>
                        </Flex>
                    )
                })}

                {friendsList.map((friend, index) => {

                    let pinColor : string;
                    if (friend.isLogged === true && friend.isAvailable === true)
                        pinColor = 'green';
                    else if (friend.isLogged === true && friend.isAvailable === false)
                        pinColor = 'yellow'
                    else
                        pinColor = 'red';
                    return(
                            <Flex key={(index)}
                            width={'100%'} 
                            minH={'66px'}
                            marginBottom={'10px'}
                            flexDir={'column'} 
                            alignItems={'center'}
                            bgColor={Constants.BG_COLOR_FADED}
                            >
                                <Flex w={'100%'}
                                flexDir={'row'} 
                                alignItems={'center'}>
                                    <Box padding={'10px'}>
                                        <CheckCircleIcon boxSize={4} color={pinColor}/>
                                    </Box>
                                    <Link overflow={'hidden'} textOverflow={'ellipsis'} onClick={() => {openProfileModal(friend.id)}}>{friend.username}</Link>
                                </Flex>

                                <Flex w={'100%'} justifyContent={'right'} paddingBottom={'10px'} paddingRight={'10px'}>
                                    <EmailIcon boxSize={4} color={'white'} //TO DO : if pending message change color to red
                                    _hover={{transform : 'scale(1.2)'}}
                                    _active={{transform : 'scale(0.9)'}}
                                    onClick={() => {
                                        props.chatSocket?.emit('DM', {targetId: friend.id})
                                    }}
                                    />
                                </Flex>
                            </Flex>
                    )
                })}
            </Flex>
        </Flex>
        <ProfileModal userId={id} isOpen={isOpen} onClose={onClose} onOpen={onOpen} chatSocket={props.chatSocket} gameSock={props.gameSocket}/>
    </>)
}

export default FriendList