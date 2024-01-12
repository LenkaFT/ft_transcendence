import { Button, Flex, FormControl, FormErrorMessage, Input, Link } from '@chakra-ui/react';
import axios from 'axios';
import React, { useEffect, useReducer, useState } from 'react';
import { useForm } from "react-hook-form";
import { Socket } from 'socket.io-client';
import { LeftBracket, RightBracket } from '../game/game-creation/Brackets';
import * as Constants from '../game/globals/const';
import AuthService from './auth.service';
import reducer, { stateType } from './components/reducer';


function Auth(props : {state: stateType, dispatch: Function, gameSock : Socket}) {
	const [authUrl, setAuthUrl] = useState('')
    const [formErrorMsg, setFormErrorMsg] = useState('')
    const [formError, setFormError] = useState(false)


	const [state, dispatch] = useReducer(reducer, {
		isAuthenticated: props.state.isAuthenticated,
		isRegistered: props.state.isRegistered,
		isTwoFactorAuthenticated: props.state.isTwoFactorAuthenticated,
		isTwoFactorAuthenticationEnabled: props.state.isTwoFactorAuthenticationEnabled
	})

	useEffect(() => {

		props.gameSock?.on('logout', () => {
			dispatch({type : 'SET_IS_AUTHENTICATED', payload : false});
		})

		return (() => {
			props.gameSock?.off('logout');
		})
	}, [props.gameSock])

	// move in service
	const fetchAuthUrl = async () => {
		try {
			const res = await axios.get(`${process.env.REACT_APP_SERVER_URL}/auth/redirect`)
			setAuthUrl(res.data.url)
		} catch (err) {
		}
	}

	const validate = async () => {

		try {
			
			const res = await AuthService.validate()
			props.dispatch({type: 'SET_IS_AUTHENTICATED', payload: true})
			dispatch({type: 'SET_IS_AUTHENTICATED', payload: true})

			props.dispatch({type: 'SET_IS_REGISTERED', payload: res.data?.isRegistered})
			dispatch({type: 'SET_IS_REGISTERED', payload: res.data?.isRegistered})
			
			props.dispatch({type: 'SET_IS_TWO_FACTOR_AUTHENTICATION_ENABLED', payload: res.data?.isTwoFactorAuthenticationEnabled})
			dispatch({type: 'SET_IS_TWO_FACTOR_AUTHENTICATION_ENABLED', payload: res.data?.isTwoFactorAuthenticationEnabled})

			props.dispatch({type: 'SET_IS_TWO_FACTOR_AUTHENTICATED', payload: res.data?.isTwoFactorAuthenticated})
			dispatch({type: 'SET_IS_TWO_FACTOR_AUTHENTICATED', payload: res.data?.isTwoFactorAuthenticated})

			setFormError(false);

			return 200
		} catch (err) {
			props.dispatch({type: 'SET_IS_AUTHENTICATED', payload: false})
			dispatch({type: 'SET_IS_AUTHENTICATED', payload: false})

			props.dispatch({type: 'SET_IS_TWO_FACTOR_AUTHENTICATED', payload: false})
			dispatch({type: 'SET_IS_TWO_FACTOR_AUTHENTICATED', payload: false})

			if (err.response?.data)
				console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
			setFormErrorMsg(err.response?.data?.error);
			setFormError(true);
			return err.response?.status
		}
	}

	const logout = async () => {
		try {
			props.dispatch({type:'SET_IS_AUTHENTICATED', payload:false})
			dispatch({type:'SET_IS_AUTHENTICATED', payload:false})
			
			props.dispatch({type:'SET_IS_TWO_FACTOR_AUTHENTICATED', payload:false})
			dispatch({type:'SET_IS_TWO_FACTOR_AUTHENTICATED', payload:false})
			await AuthService.logout(state.isTwoFactorAuthenticated, props.gameSock)
			window.location.reload()
		} catch(err) {
			if (err.response?.data)
				console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
		}
	}

	const onSubmit2fa = async (data:any) => {
		try {
			await AuthService.twoFactorAuthenticationLogin(data.twoFactorAuthenticationCode)

			props.dispatch({type:'SET_IS_TWO_FACTOR_AUTHENTICATED', payload:true})
			dispatch({type:'SET_IS_TWO_FACTOR_AUTHENTICATED', payload:true})

			setFormError(false);
		} catch(err) {
			if (err.response?.data)
				console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
			setFormErrorMsg(err.response?.data?.message);
			setFormError(true);
		}
	}

	const onSubmit = async (data:any, e:any) => {
		e.preventDefault()
		try {
			const formData = new FormData()
			if (data.avatar)
				formData.append("file", data.avatar[0])
			formData.append("username", data.username)


			await AuthService.register(formData)

			props.dispatch({type:'SET_IS_REGISTERED', payload:true})
			dispatch({type:'SET_IS_REGISTERED', payload:true})

			setFormError(false);
			props.gameSock.emit('registered');
		} catch(err) {
			if (err.response?.data)
				console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
			setFormErrorMsg(err.response?.data?.message);
			setFormError(true);
		}
	}


	function LoginComponent() {
		return (
			<Flex background={Constants.BG_COLOR}
			minW={'320px'}
			h={'100vh'}
			overflow={'auto'}
			>
				<Flex width={'100%'} height={'100%'}
				alignItems={'center'}
				justifyContent={'center'}
				className='goma'
				>
					<Link href={authUrl}>
						<Button fontWeight={'normal'}
						borderRadius={'0px'}
						_hover={{transform :'scale(1.2)'}}>
						LOG IN WITH 42
						</Button>
					</Link>
				</Flex>
			
			</Flex>
		)
	}

	function RegisterComponent() {
		const { register, handleSubmit, formState: { errors } } = useForm();
		return (
			<Flex background={Constants.BG_COLOR}
			minW={'320px'}
			h={'100vh'}
			overflow={'auto'}
			>
				<Flex width={'100%'} height={'100%'}
				alignItems={'center'}
				justifyContent={'center'}
				className='goma'
				>
					<Flex
					minH={'420px'} 
					minW={'320px'}
					maxW={'640px'} 
					height={'33%'}
					width={'33%'}
					bg={Constants.BG_COLOR_FADED}
					justifyContent={'space-evenly'}
					alignItems={'center'}
					flexDir={'column'}
					>
						<form onSubmit={handleSubmit(onSubmit)} style={{height : '320px', width : '320px'}}>
							<Flex
							width={'100%'}
							height={'50%'}
							display={'flex'} flexDir={'column'} 
							justifyContent={'space-evenly'}
							>
								<FormControl isRequired isInvalid={formError}>
									<Input
									w={'90%'}
									marginLeft={'5%'}
									marginRight={'5%'}
									marginBottom={'10px'}
									type="text"
									borderRadius={'0px'}
									focusBorderColor="white"
									textColor={'white'}
									placeholder="Nom d'utilisateur"
									{
										...register("username", {
											required: "Please enter first name",
											minLength: 3,
											maxLength: 20,
										})
										}
									/>
									<FormErrorMessage>{formErrorMsg}</FormErrorMessage>
								</FormControl>

								<FormControl isRequired>
									<Input
									w={'90%'}
									marginLeft={'5%'}
									marginRight={'5%'}
									marginBottom={'10px'}
									borderRadius={'0px'}
									textColor={'white'}
									border={'none'}
									required={false}
									type="file"
									{
										...register("avatar", {
										})
									}
									accept="image/*"
									/>
								</FormControl>
							</Flex>
							

							<Flex
							w={'100%'}
							alignItems={'center'} 
							justifyContent={'center'}
							>
									<LeftBracket w={'20px'} h={'100px'} girth={'8px'} marginRight='-8px'/>
										<Button 	
											fontSize={'2xl'}
											fontWeight={'normal'}
											textColor={'white'}
											bgColor={Constants.BG_COLOR_FADED}
											h={'78px'}
											borderRadius={'0px'}
											type='submit'
											className='goma'
											_hover={{bg: 'white', textColor : 'black'}}
											>
												REGISTER
										</Button>
									<RightBracket w={'20px'} h={'100px'} girth={'8px'} marginLeft='-8px'/>
							</Flex>
						</form>
					</Flex>
				</Flex>

				<Flex pos={'fixed'} bottom={'0'} right={'0'} className='goma'>
					{<LogoutComponent />}
				</Flex>
			</Flex>
		)
	}

	function LogoutComponent() {
		return (
			<>
				<Button onClick={logout}
				fontWeight={'normal'}
				borderRadius={'0px'}
				bg={'none'}
				textColor={'white'}
				_hover={{background : 'white', textColor : Constants.BG_COLOR}}
				>LOGOUT</Button>
			</>
		)
	}

	function TwoFactorAuthenticationComponent() {
		const { register, handleSubmit, formState: { errors } } = useForm();

		return (<>
			<Flex background={Constants.BG_COLOR}
			minW={'320px'}
			h={'100vh'}
			overflow={'auto'}
			>
				<Flex width={'100%'} height={'100%'}
				alignItems={'center'}
				justifyContent={'center'}
				className='goma'>
					<Flex
					minH={'420px'} 
					minW={'320px'}
					maxW={'640px'} 
					height={'33%'}
					width={'33%'}
					bg={Constants.BG_COLOR_FADED}
					justifyContent={'space-evenly'}
					alignItems={'center'}
					flexDir={'column'}
					>
						<form onSubmit={handleSubmit(onSubmit2fa)} style={{height : '100%', width : '100%'}}>
							<FormControl isRequired isInvalid={formError}
							width={'100%'} 
							height={'40%'}
							marginTop={'10%'}
							display={'flex'}
							flexDir={'column'}
							alignItems={'center'} 
							justifyContent={'center'}
							>

									<Input
										placeholder="2fa code"
										w={'80%'}
										marginLeft={'10%'}
										marginRight={'10%'}
										marginBottom={'10px'}
										type="text"
										borderRadius={'0px'}
										focusBorderColor="white"
										textColor={'white'}
										{
											...register("twoFactorAuthenticationCode", {
												required: "enter 2facode",
												minLength: 3,
												maxLength: 80
											})
										}
										/>
									<FormErrorMessage> {formErrorMsg} </FormErrorMessage>

							</FormControl>

							<Flex
							w={'100%'}
							h={'40%'}
							alignItems={'center'} 
							justifyContent={'center'}
							>
									<LeftBracket w={'20px'} h={'80px'} girth={'8px'} marginRight='-8px'/>
										<Button 	
											fontSize={'2xl'}
											fontWeight={'normal'}
											textColor={'white'}
											bgColor={Constants.BG_COLOR_FADED}
											h={'58px'}
											borderRadius={'0px'}
											type='submit'
											className='goma'
											_hover={{bg: 'white', textColor : 'black'}}
											>
												LOG IN
										</Button>
									<RightBracket w={'20px'} h={'80px'} girth={'8px'} marginLeft='-8px'/>
							</Flex>
						</form>
					</Flex>
				</Flex>

				<Flex pos={'fixed'} bottom={'0'} right={'0'} className='goma'>
					{<LogoutComponent />}
				</Flex>
			</Flex>
		</>
		)
	}


	useEffect(() => {
        async function asyncWrapper() {
        fetchAuthUrl()
        const status = await validate();
        if (status === 200) {
			props.dispatch({type:'SET_IS_AUTHENTICATED', payload:true})
			dispatch({type:'SET_IS_AUTHENTICATED', payload:true})
		} else {
			props.dispatch({type:'SET_IS_AUTHENTICATED', payload:false})
			dispatch({type:'SET_IS_AUTHENTICATED', payload:false})
		}
    };
    asyncWrapper();
    }, [state.isAuthenticated, state.isRegistered, state.isTwoFactorAuthenticated])

	return (<>

			{state.isAuthenticated && (!state.isTwoFactorAuthenticated && state.isTwoFactorAuthenticationEnabled) && <TwoFactorAuthenticationComponent />}
			{ state.isAuthenticated && !state.isRegistered && <RegisterComponent/>}
			{!state.isAuthenticated && <LoginComponent />}
	</>)
}

export default Auth