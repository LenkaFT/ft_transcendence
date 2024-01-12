import { Button, Flex, FormControl, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay, useToast } from "@chakra-ui/react"
import React from "react"
import { useForm } from "react-hook-form"
import { Socket } from "socket.io-client"
import authService from "../../auth/auth.service"
import * as Const from '../../game/globals/const'
import BasicToast from "../../toast/BasicToast"

function ChannelPasswordModal(props : {setTargetRoom: Function, roomName: string, isOpen : boolean, onOpen : () => void , onClose : () => void, chatSocket: Socket}){

    const { register: registerJoin, 
        handleSubmit: handleSubmitJoin, 
        reset: resetJoin, 
        formState: { errors: errorJoin }
    } = useForm()
    const toast = useToast();


    const  joinRoom = async (dt: {room: string, password: string}) => {
        try{
            const res = await authService.post(process.env.REACT_APP_SERVER_URL + '/room/joinRoom',
            {
                name: dt.room,
                password: dt.password
            })
            props.chatSocket?.emit("joinRoom", res.data.id)
            props.onClose()
            props.setTargetRoom(res.data)
        }
        catch(err){

            if (err.response?.status === 409)
            {
                toast({
                    isClosable: true,
                    duration : 5000,
                    render : () => ( <> 
                        <BasicToast text={err.response?.data?.error}/>
                    </>)
                })
            }
            else if (err.response?.status === 403){
                toast({
                    isClosable: true,
                    duration : 5000,
                    render : () => ( <> 
                        <BasicToast text={err.response.data.message}/>
                    </>)
                })
            }
            else
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    const onSubmitJoin = (data: {password: string}) => {
        joinRoom({room: props.roomName, password: data.password})
        resetJoin()
    }

    return (
        <>
        <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered>
          <ModalOverlay  
            bg='blackAlpha.300'
            backdropFilter='blur(10px)'
        />   
           <ModalContent borderRadius={'0px'} bg={Const.BG_COLOR_FADED} textColor={'white'} className="goma"
            paddingTop={'10px'} paddingBottom={'10px'}>
                <Flex display={'flex'} flexDir={'row'}
                alignContent={'left'}
                alignItems={'center'}
                justifyContent={'center'}
                width={'448px'}
                marginBottom={'20px'}
                >
            <ModalCloseButton />
            <ModalBody>
                    <Flex alignItems="center" justifyContent="center" marginBottom='20px'>
                        <h3>type your password</h3>
                    </Flex>
                    <form onSubmit={handleSubmitJoin(onSubmitJoin)}style={
                        {
                            alignItems: "center", 
                            display: "flex", 
                            justifyContent:"center", 
                            width: "100%",
                            flexWrap:"wrap",
                            
                        }}>
                        <FormControl isRequired>
                            <Input
                                marginBottom="10px"
                                type="password"
                                placeholder="Please enter a password"
                                {
                                    ...registerJoin("password", {
                                        required: "enter password",
                                    })
                                }
                            />
                        </FormControl>
                        <Button
                        fontWeight={'normal'}
                        borderRadius={'0px'}
                        textAlign={'center'}
                        bg={'none'}
                        textColor={'white'}
                        _hover={{background : 'white', textColor : Const.BG_COLOR}} 
                        type='submit' marginTop="15px"
                        >
                            JOIN
                            </Button>
                    </form>
            </ModalBody>
            </Flex>
          </ModalContent>
        </Modal>
      </>
    )
}

export default ChannelPasswordModal