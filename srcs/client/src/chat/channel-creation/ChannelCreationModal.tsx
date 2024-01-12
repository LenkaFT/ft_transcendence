import {
    Flex,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalOverlay,
    Text,
    useToast
} from '@chakra-ui/react'
import React, { useEffect, useState } from "react"
import { Button, Checkbox, FormControl, Input } from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { Socket } from "socket.io-client"
import authService from "../../auth/auth.service"
import * as Const from '../../game/globals/const'
import BasicToast from "../../toast/BasicToast"

function ChannelCreationModal(props : {isOpen : boolean, onOpen : () => void , onClose : () => void, chatSocket: Socket, setTargetRoom: Function}) {
    
    const toast = useToast();
    const [ErrorMsg, setErrorMsg] = useState('')
    const [formError, setFormError] = useState(false)
    const [checked, setChecked] = useState(false)
    const [privateChan, setPrivate] = useState(false)
    const { register: registerCreate, 
            handleSubmit: handleSubmitCreate, setValue,
            reset: resetCreate, 
            formState: { errors: errorCreate }
    } = useForm()

    const createRoom = async (dt: {room: string, password: string}) => {       

        setValue('password', '')
        setChecked(false)
        if (dt.room !== "")
        {
            let data = {name: dt.room, password: dt.password, privChan: privateChan}
            try{
                await authService.post(process.env.REACT_APP_SERVER_URL + '/room', data)
                setPrivate(false)
                setFormError(false)
                joinRoom(dt)   
            }
            catch(err){

                setFormError(true)
                setErrorMsg(err.response?.data?.message)
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        }
        else {
            setValue('password', '')
            setChecked(false)
        }    
       
    }


    const  joinRoom = async (dt: {room: string, password: string}) => {
        try{
            const res = await authService.post(process.env.REACT_APP_SERVER_URL + '/room/joinRoom',
            {
                name: dt.room,
                password: dt.password
            })
            props.chatSocket?.emit("joinRoom", res.data.id)
            props.chatSocket.emit('channelCreation');
            props.setTargetRoom(res.data)

            setErrorMsg('');
            setFormError(false);
            props.onClose()
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
            else
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
        }
    }

    const onSubmitCreate = (data: {room: string, password: string}) => {
        createRoom(data)
        resetCreate()
    }

    useEffect(() => {
        setErrorMsg('');
        setFormError(false);
    }, [props.isOpen])

    return (
      <>
        <Modal isOpen={props.isOpen} onClose={() => {props.onClose(); setChecked(false); setPrivate(false)}} isCentered>
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
            <ModalCloseButton marginBottom={'40px'}/>
            <ModalBody>
                    <Flex marginBottom='25px'>
                    </Flex>
                    <Flex w={'100%'} justifyContent={'center'} marginBottom={'10px'}>
                        {formError && <Text textAlign={'center'} textColor={'red.500'}> {ErrorMsg} </Text>}
                    </Flex>
                    <form onSubmit={handleSubmitCreate(onSubmitCreate)} style={
                        {
                            alignItems: "center", 
                            display: "flex", 
                            justifyContent:"center", 
                            marginBottom: '10px',
                            width: "100%",
                            flexWrap:"wrap",
                            
                        }}>
                            <FormControl isRequired isInvalid={formError}>
                                <Input
                                    marginBottom="10px"
                                    type="text"
                                    placeholder="Please enter a channel name"
                                    {
                                        ...registerCreate("room", {
                                            required: "enter channel name"
                                        })
                                    }
                                />
                            </FormControl>
                        {checked && (
                        <FormControl isRequired  isInvalid={formError}>
                            <Input
                                marginBottom="10px"
                                type="password"
                                placeholder="Please enter a password"
                                {
                                    ...registerCreate("password", {
                                        required: "enter password"
                                    })
                                }
                            />
                        </FormControl> )}
                        <Button
                        fontWeight={'normal'}
                        borderRadius={'0px'}
                        textAlign={'center'}
                        bg={'none'}
                        textColor={'white'}
                        _hover={{background : 'white', textColor : Const.BG_COLOR}} 
                        type='submit' marginTop="10px"
                        >
                            CREATE CHANNEL
                        </Button>
                    </form>    
                    <Flex alignItems="center" justifyContent="space-evenly" marginTop="20px" >
                    <Checkbox 
                        colorScheme='green'
                        isChecked={checked}
                        onChange={(event) => {

                            if (checked === false) {
                                setChecked(event.target.checked)
                                setPrivate(event.target.checked ? false : true)
                                setValue('password', '')
                            }
                            else
                                setChecked(false);
                        }}
                        > password 
                    </Checkbox>
                    <Checkbox 
                        colorScheme='green'
                        isChecked={privateChan}
                        onChange={(event) => {
                            
                            if (privateChan === false)
                            {
                                setPrivate((event.target as HTMLInputElement).checked)
                                setChecked(event.target.checked ? false : true)
                                setValue('password', null)
                            }
                            else
                                setPrivate(false)
                        }
                        }> private channel 
                    </Checkbox>
                    </Flex>
            </ModalBody>
            </Flex>
          </ModalContent>
        </Modal>
      </>
    )
  }

  export default ChannelCreationModal