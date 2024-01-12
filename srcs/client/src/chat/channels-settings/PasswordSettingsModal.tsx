import { Button, Flex, FormControl, FormErrorMessage, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay, useToast } from "@chakra-ui/react"
import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { Socket } from "socket.io-client"
import authService from "../../auth/auth.service"
import * as Const from '../../game/globals/const'
import BasicToast from "../../toast/BasicToast"

function PasswordSettingsModal(props : {action: string, roomId: number, chatSocket : Socket,isOpen : boolean, onOpen : () => void , onClose : () => void}){

    const { register: registerSetPass, 
        handleSubmit: handleSubmitSetPass, 
        reset: resetSetPass, 
        formState: { errors: errorSetPass } } = useForm()
    const { register: registerChangePass, 
        handleSubmit: handleSubmitChangePass, 
        reset: resetChangePass, 
        formState: { errors: errorChangePass } } = useForm()
    const toast = useToast();
    const [errorMsg, setErrorMsg] = useState('')
    const [formError, setFormError] = useState(false)

    async function changePassword(roomId: number, password: string){
        try{
            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/changePassword', 
            {
                roomId: roomId, 
                password: password
            })
            props.onClose()
            setFormError(false)
            toast({
                duration: 5000,
                render : () => ( <> 
                    <BasicToast text="Password have been successfully updated."/>
                </>)
              })
        }
        catch(err){
            setFormError(true)
            setErrorMsg(err.response?.data?.message)
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    async function setPassword(roomId: number, password: string){
        try{
            await authService.post(process.env.REACT_APP_SERVER_URL + '/room/setPassword', 
            {
                roomId: roomId, 
                password: password
            })
            setFormError(false)
            props.chatSocket?.emit('channelStatusUpdate');
            props.onClose()
            toast({
                duration: 5000,
                render : () => ( <> 
                    <BasicToast text="Password have been successfully set."/>
                </>)
              })
        }
        catch(err){
            setFormError(true)
            setErrorMsg(err.response?.data?.message)
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    const onSubmitSetPass = (data: {password: string}) => {
        setPassword(props.roomId, data.password)
        resetSetPass()
    }

    const onSubmitChangePass = (data: {password: string}) => {
        changePassword(props.roomId, data.password)
        resetChangePass()
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
                    </Flex>
                    {props.action === 'setPass' && <form onSubmit={handleSubmitSetPass(onSubmitSetPass)}style={
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
                                type="password"
                                placeholder="Please enter a password"
                                {
                                    ...registerSetPass("password", {
                                        required: "enter password",
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
                            SET PASSWORD
                            </Button>
                    </form>}
                    {props.action === 'changePass' && <form onSubmit={handleSubmitChangePass(onSubmitChangePass)}style={
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
                                type="password"
                                placeholder="Please enter a password"
                                {
                                    ...registerChangePass("password", {
                                        required: "enter password",
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
                            CHANGE PASSWORD   
                            </Button>
                    </form>}
            </ModalBody>
            </Flex>
          </ModalContent>
        </Modal>
      </>
    )
}

export default PasswordSettingsModal