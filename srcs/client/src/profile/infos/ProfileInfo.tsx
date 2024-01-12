import { Avatar, Box, Flex, Image, Text } from '@chakra-ui/react';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import authService from '../../auth/auth.service';
import { LeftBracket, RightBracket } from '../../game/game-creation/Brackets';
import * as Constants from '../../game/globals/const';
import PlayerHistory from './PlayerHistory';

function ProfileInfo( props : {gameSock : Socket, chatSock : Socket}) {
    const [user, setUser] = useState(undefined);
    const [fontSize, setFontSize] = useState(window.innerWidth > 1300 ? '2em' : '1em');
    const [accordionFontSize, setAccordionFontSize] = useState(window.innerWidth > 800 ? '1em' : '0.75em');
    const [secretImage, setSecretImage] = useState(false);
    
    useLayoutEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const me = await authService.get(process.env.REACT_APP_SERVER_URL + '/auth/validate');
                const user = await authService.get(process.env.REACT_APP_SERVER_URL + '/users/profile/' + me?.data?.id);
                setUser(user.data)
    
            } catch (err) {
                if (err.response?.data)
                  console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)
            }
        }
     
        fetchUserProfile();
    }, []);

    useEffect(function DOMEvents() {

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
  
      const debouncedHandleResize = debounce (function handleResize() {
        if (window.innerWidth > 1300)
          setFontSize('2em');
        else if (window.innerWidth > 1000)
          setFontSize('1.5em')
        else if (window.innerWidth < 800)
        {
          setFontSize('1em')
          setAccordionFontSize('0.75em')
        }
      }, Constants.DEBOUNCE_TIME)
  
      window.addEventListener('resize', debouncedHandleResize)
  
      return(() => {
        window.removeEventListener('resize', debouncedHandleResize)
      })
    }, [fontSize]);

    return (<>
        <Box display={'flex'} flexDir={'row'} flexWrap={'wrap'}
        alignItems={'center'}
        justifyContent={'center'}
        width={'100%'}
        marginBottom={'20px'}
        >
            <Flex w={'100%'}
            alignItems={'center'}
            justifyContent={'center'}
            marginBottom={'10%'}>
                {fontSize === '2em' ? <LeftBracket w={'16px'} h={'44px'} girth={'4px'} marginRight="-5px"/> : <LeftBracket w={'12px'} h={'32px'} girth={'4px'} marginRight="-4px"/>}
                    <Text fontWeight={'normal'} textAlign={'center'} padding={'0px'} fontSize={fontSize}
                    > 
                    {user?.username} 
                    </Text>
                {fontSize === '2em' ? <RightBracket w={'16px'} h={'44px'} girth={'4px'} marginLeft="-5px"/> : <RightBracket w={'12px'} h={'32px'} girth={'4px'} marginLeft="-4px"/>}
            </Flex>

            <Flex w={'100%'}
            justifyContent={'space-evenly'}
            flexDir={'row'}
            flexWrap={'wrap'}>
              <Box width={'160px'}>
                {!secretImage && <Avatar
                boxSize={'160px'}
                borderRadius={'full'}
                name={user?.username}
                src={user?.id != undefined ? process.env.REACT_APP_SERVER_URL + '/users/avatar/' + user?.id : ""}
                onClick={() => setSecretImage(true)}
                ></Avatar>}
                {secretImage && <Image
                boxSize={'160px'}
                borderRadius={'full'}
                src={'https://decider.com/wp-content/uploads/2016/12/rats-morgan-spurlock-review.jpg?quality=75&strip=all&w=1200&h=800&crop=1'}
                onClick={() => setSecretImage(false)}
                ></Image>}
              </Box>

              <Box 
              display={'flex'} flexDir={'column'}
              alignContent={'left'}
              alignItems={'center'}
              justifyContent={'center'}
              >
                <Text textAlign={'center'} fontSize={fontSize}> WINS </Text>
                <Text textAlign={'center'} fontSize={fontSize}> {user?.winsAmount} </Text>
              </Box>

              <Box 
              display={'flex'} flexDir={'column'}
              alignContent={'left'}
              alignItems={'center'}
              justifyContent={'center'}
              >
                <Text textAlign={'center'} fontSize={fontSize}> LOOSES </Text>
                <Text textAlign={'center'} fontSize={fontSize}> {user?.loosesAmount} </Text>
              </Box>
              <Flex w={'100%'} justifyContent={'center'} padding={'10px'}>
                <Text fontSize={'1.5em'}> PLAYER HISTORY </Text>
              </Flex>
              <Box 
              width={'100%'} 
              height={'600px'}
              overflow={'auto'}
              >
                <PlayerHistory userId={user?.id} gameSocket={props.gameSock} chatSocket={props.chatSock}/>
              </Box>
            </Flex>
        </Box>
    </>)
}

export default ProfileInfo