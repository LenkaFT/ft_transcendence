import { CheckCircleIcon, EmailIcon } from "@chakra-ui/icons"
import {
    Box,
    Flex,
    Link,
    Text,
    useDisclosure
} from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { Socket } from "socket.io-client"
import authService from "../../auth/auth.service"
import * as Constants from '../../game/globals/const'
import ProfileModal from "../../profile/modal/ProfileModal"
import FriendList from "./FriendList"

async function getUserList(me : {username: string, id: string}){
    let userList: {
        id: string,
        username: string,
        isuser: boolean,
        isLogged: boolean,
        isAvailable: boolean,
        isRegistered: boolean
    }[]
    try{
        const res =  await authService.get(process.env.REACT_APP_SERVER_URL + '/users/')
        userList = res.data
        userList = userList
            .filter(user => user.id !== me?.id)
            .filter(user => user.isLogged === true)
            .filter(user => user.isRegistered === true);
    }
    catch(err){
        throw err
    }
    return userList
}

function UserList(props: {chatSocket: Socket, gameSocket : Socket}){
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [id, setId] = useState("")
    const [userList, setUserList] = useState
    <{  id: string
        username: string,
        isuser: boolean,
        isLogged: boolean,
        isAvailable: boolean
    }[]>([])

    const fetchUserList = async () => {
        try {
            const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/auth/validate')
            const list = await getUserList({id: res?.data?.id, username: res?.data?.username});
            setUserList(list);
        }
        catch (err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

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

        const debouncedFetchUserList = debounce(fetchUserList, 500);

        props.gameSocket?.on('userListUpdate', debouncedFetchUserList);

        return(() => {
            props.gameSocket?.off('userListUpdate');
        });
    })

    useEffect(() => {
        fetchUserList();

    }, [])
    
    return (<>
    <Flex 
    h={'50%'}
    w={'100%'}
    bg={Constants.BG_COLOR}
    padding={'10px'}
    wrap={'nowrap'}
    flexDir={'column'}
    >

    <Text w={'100%'} textAlign={'center'} marginBottom={'10px'}> USERS LIST </Text>
        <Flex
        w={'100%'}
        bg={Constants.BG_COLOR}
        wrap={'nowrap'}
        flexDir={'column'}
        overflowY={'auto'}
        >
        {userList.map((user, index) => {

            let pinColor : string;
            if (user.isLogged === true && user.isAvailable === true)
                pinColor = 'green';
            else if (user.isLogged === true && user.isAvailable === false)
                pinColor = 'yellow'
            else
                pinColor = 'red';
            return(
                    <Flex 
                    key={index}
                    width={'100%'} 
                    minH={'66px'}
                    marginBottom={'10px'}
                    flexDir={'column'} 
                    alignItems={'center'}
                    bgColor={Constants.BG_COLOR_FADED}
                    overflow={'hidden'}
                    >
                        <Flex w={'100%'}
                        flexDir={'row'} 
                        alignItems={'center'}>
                            <Box padding={'10px'}>
                                <CheckCircleIcon boxSize={4} color={pinColor}/>
                            </Box>
                            <Link overflow={'hidden'} textOverflow={'ellipsis'} onClick={() => {onOpen() ; setId(user.id)}}> {user.username} </Link>
                        </Flex>

                        <Flex w={'100%'} justifyContent={'right'} paddingBottom={'10px'} paddingRight={'10px'}>
                            <EmailIcon boxSize={4} color={'white'} //TO DO : if pending message change color to red
                            _hover={{transform : 'scale(1.2)'}}
                            _active={{transform : 'scale(0.9)'}}
                            onClick={() => {
                                props.chatSocket?.emit('DM', {targetId: user.id})
                            }}
                            />
                        </Flex>
                    </Flex>
            )
        })}
        </Flex>
        <ProfileModal userId={id} isOpen={isOpen} onClose={onClose} onOpen={onOpen} chatSocket={props.chatSocket} gameSock={props.gameSocket}/>
</Flex>
</>)
}

export default UserList