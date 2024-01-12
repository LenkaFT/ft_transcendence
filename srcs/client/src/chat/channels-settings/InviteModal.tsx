import { Button, Flex, FormControl, FormErrorMessage, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay, useToast } from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Socket } from "socket.io-client"
import * as Const from '../../game/globals/const'
import BasicToast from "../../toast/BasicToast"

function InviteModal(props : {socket: Socket, roomId: number, isOpen : boolean, onOpen : () => void , onClose : () => void}){
  
  const [errorMsg, setErrorMsg] = useState('')
  const [formError, setFormError] = useState(false)
    const { register: registerSetInvite, 
        handleSubmit: handleSubmitInvite, 
        reset: resetInvite, 
        formState: { errors: errorSetPass }
    } = useForm()

    const toast = useToast();

    const onSubmitInvite = (data: {friend: string}) => {
        props.socket?.emit('invitePrivateChannel', {roomId: props.roomId, guestUsername: data.friend})
    }

    useEffect(() => {
      props.socket?.on('chanInvite', (guestUsername: string) => {
          resetInvite()
          props.onClose()
          const id = 'invite-toast';
          if(!toast.isActive(id)){
            toast({
              id,
              isClosable: true,
              duration : 2000,
              render : () => ( <>
                <BasicToast text={`You sent an invitation to ${guestUsername}`}/>
            </>)
            })
          }
        })
      
      props.socket?.on('inviteError', (error: string) => {
        setFormError(true)
        setErrorMsg(error)
      })
      
      return () => {
        props.socket?.off('chanInvite')
        props.socket?.off('inviteError')
      }
    })


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
                    </Flex>
                    <form onSubmit={handleSubmitInvite(onSubmitInvite)}style={
                        {
                            alignItems: "center", 
                            display: "flex", 
                            justifyContent:"center", 
                            width: "100%",
                            flexWrap:"wrap",
                            
                        }}>
                        <FormControl isRequired isInvalid={formError}>
                            <Input
                                marginBottom="10px"
                                type="text"
                                placeholder="Please enter a username"
                                {
                                    ...registerSetInvite("friend", {
                                        required: "enter username",
                                        maxLength: 20,
                                        minLength: 3
                                    })
                                }
                            />
                            <FormErrorMessage>{errorMsg}</FormErrorMessage>
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
                            Invite your friend
                            </Button>
                    </form>
            </ModalBody>
            </Flex>
          </ModalContent>
        </Modal>
      </>
    )
}

export default InviteModal