import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Box,
    Link,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    useDisclosure
} from '@chakra-ui/react';
import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import authService from "../../auth/auth.service";
import * as Constants from '../../game/globals/const';
import { DBGame } from "../../game/globals/interfaces";
import ProfileModal from "./ProfileModal";


function PlayerHistoryAccordion(props : {userId : string, isOpen? : boolean, fontSize?: string, gameSocket: Socket, chatSocket : Socket}) {
    const [history, setHistory] = useState<DBGame[]>([]);
    const [targetId, setTargetId] = useState<string>('');
    const { isOpen, onOpen, onClose } = useDisclosure();

    async function getHistory(id : string) {
        if (props.userId != undefined)
        {
            try {
                const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/users/history/' + id);
                setHistory(res.data);
            }
            catch (err) {
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)}  
        }
    }

    function openProfileModal(id : string) {

        setTargetId(id);
        onOpen();
    }

    useEffect(() => {
        getHistory(props.userId);
    }, [props.userId])

    useEffect(() => {

        props.gameSocket?.on('updateHistory', () => {
            getHistory(props.userId);
        })

        return (() => {
            props.gameSocket?.off('updateHistory');
        })
    })

    return (<>
        <Accordion allowToggle defaultIndex={props.isOpen ? [0] : undefined}  
        marginTop={'40px'}> 
            <AccordionItem border={'none'}>
                <h2>
                    <AccordionButton>
                        <Box as="span" flex='1' textAlign='center' fontSize={'1.5em'}>
                            Player History
                        </Box>
                        <AccordionIcon />
                    </AccordionButton>
                </h2>
                <AccordionPanel  padding={'0px'} overflowY={'auto'} overflowX={'hidden'} maxHeight={'400px'}>
                    <Table overflowY={'auto'} maxHeight={'400px'}>
                        <Thead>
                            <Tr>
                                <Th> Player </Th>
                                <Th></Th>
                                <Th> Adversary </Th>
                            </Tr>
                        </Thead>
                        <Tbody padding={'0px'}>
                        {
                            history.map((value, index) => {

                            return (<Tr key={index}>
                                <Td fontSize={props.fontSize ? props.fontSize: '1em'} w={'33%'} textAlign={'center'}> 
                                    {props.userId === value.winnerId ? value.winnerUsername : value.looserUsername} 
                                </Td>

                                <Td fontSize={props.fontSize ? props.fontSize: '1em'} w={'33%'} textAlign={'center'}
                                textColor={props.userId === value.winnerId ? Constants.DARKERKER_BLUE : Constants.DARKERKER_RED}
                                > 
                                    {props.userId === value.winnerId ? "WON TO" : "LOST TO"} 
                                </Td>

                                <Td fontSize={props.fontSize ? props.fontSize: '1em'} w={'33%'} textAlign={'center'}>
                                    <Link textAlign={'center'} onClick={() => {openProfileModal(props.userId === value.winnerId ? value.looserId : value.winnerId)}}>
                                        {props.userId === value.winnerId ? value.looserUsername : value.winnerUsername} 
                                    </Link>
                                </Td>
                            </Tr>)
                        })}
                        </Tbody>
                    </Table>
                    <ProfileModal userId={targetId} isOpen={isOpen} onClose={onClose} onOpen={onOpen} gameSock={props.gameSocket} chatSocket={props.chatSocket}/>   
                </AccordionPanel>
            </AccordionItem>
        </Accordion>
    </>)
}

export default PlayerHistoryAccordion