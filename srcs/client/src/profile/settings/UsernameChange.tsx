import { Button, Flex, FormControl, FormErrorMessage, FormHelperText, Input } from '@chakra-ui/react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import authService from '../../auth/auth.service';
import * as Constants from '../../game/globals/const';


function UsernameChangeForm( props : {setFormVisible : Function}) {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [formError, setFormError] = useState(false)
    const [formErrorMsg, setFormErrorMsg] = useState('')


    async function onChangeUsername(data : {newUsername : string}) {

        try {
            const formData = new FormData()
            if (data.newUsername)
                formData.append("username", data.newUsername)
            
            await authService.register(formData)
            props.setFormVisible(false);
            setFormError(false);
        }
        catch(err) {
            if (err.response?.data)
                console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            setFormError(true);
            setFormErrorMsg(err.response?.data?.message);
        }
    }

    return (
        <form onSubmit={handleSubmit(onChangeUsername)} style={{display: 'flex', flexDirection : 'column', justifyContent : 'center', alignItems: 'center'}}>
            <FormControl isRequired isInvalid={formError}>
                    <Input
                    borderRadius={'0px'}
                    type="text"
                    textAlign={'center'}
                    marginBottom={'10px'}
                    {
                        ...register("newUsername", {
                            required: "enter new username",
                        })
                    }
                    />
                    {!formError && <FormHelperText>Enter your new username !</FormHelperText>}
                    <FormErrorMessage> {formErrorMsg}</FormErrorMessage>
            </FormControl>

            <Button
            fontWeight={'normal'}
            w={'150px'}
            borderRadius={'0px'}
            marginTop={'10px'}
            textAlign={'center'}
            bg={'none'}
            textColor={'white'}
            _hover={{background : 'white', textColor : Constants.BG_COLOR}}
            type='submit'
            >
                SUBMIT
            </Button>
        </form>
    )
}

function UsernameChange() {

    const [formVisible, setFormVisible] = useState(false)
    const text = formVisible ? "MAYBE NOT" : "CHANGE MY USERNAME"

    return (<>
            <Flex minH={'353px'}
        alignItems={'center'}
        justifyContent={'center'}
        flexDir={'column'}
        padding={'10px'}
        >
            <Button onClick={() => setFormVisible(formVisible ? false : true)}
            fontWeight={'normal'}
            borderRadius={'0px'}
            marginBottom={'10px'}
            bg={'none'}
            textColor={'white'}
            _hover={{background : 'white', textColor : Constants.BG_COLOR}}
            > 
            {text} 
            </Button>
            {formVisible && <UsernameChangeForm setFormVisible={setFormVisible}/>}
        </Flex>
    </>)
}

export default UsernameChange