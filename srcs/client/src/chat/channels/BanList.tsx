import React from "react"
import authService from "../../auth/auth.service"
import { Room } from "../interfaces/interface"
import { Socket } from "socket.io-client"
import {ListItem, UnorderedList, Text, Flex, Button, useToast} from "@chakra-ui/react"
import BasicToast from "../../toast/BasicToast"
import * as Constants from '../../game/globals/const'

function BanList(props : {banList :  {username : string, id : string}[], room : Room, chatSock : Socket}) {

    const toast = useToast();

    async function unbanThem(targetId : string, roomId : number) {
        try {
            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/unbanUser', 
            {targetId : targetId, roomId : roomId});
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

    return (<>
            {props.banList?.map((bannedUser, index) => {
                return (
                    <Flex  key={index}
                    flexDir={'column'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    margin={'10px'}
                    >
                                <Text> {bannedUser.username}</Text>
                                <Button onClick={() => {unbanThem(bannedUser.id, props.room?.id)}}
                                borderRadius={'0px'}
                                fontWeight={'normal'}
                                _hover={{bg : Constants.WHITE_BUTTON_HOVER}}
                                > UNBAN </Button>
                    </Flex>
                )
            })}
    </>)
}

export default BanList