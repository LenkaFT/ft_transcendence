import {
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
import ProfileModal from "../modal/ProfileModal";

function PlayerHistory(props : {userId : string, chatSocket : Socket, gameSocket : Socket}) {

    const [history, setHistory] = useState<DBGame[]>([]);
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [adversaryId, setAdversaryId] = useState<string>(undefined);

    async function getHistory(id : string) {
        if (props.userId != undefined)
        {
            try {
                const res = await authService.get(process.env.REACT_APP_SERVER_URL + '/users/history/' + id);
                setHistory(res.data);
            }
            catch (err) {
                if (err.response?.data)
                    console.error(`${err.response?.data?.message} (${err.response?.data?.error})`)

            }
        }
    }

    const toggleUserId = (value : DBGame) => {
        props.userId === value.winnerId ? setAdversaryId(value.looserId) : setAdversaryId(value.winnerId)
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
    <Table>
        <Thead>
            <Tr>
                <Th> Player </Th>
                <Th></Th>
                <Th> Adversary </Th>
            </Tr>
        </Thead>
        <Tbody>
        {
            history.map((value, index) => {

            return (<Tr key={index}>
                <Td> 
                    {props.userId === value.winnerId ? value.winnerUsername : value.looserUsername} 
                </Td>

                <Td 
                textColor={props.userId === value.winnerId ? Constants.DARKERKER_BLUE : Constants.DARKERKER_RED}
                > 
                    {props.userId === value.winnerId ? "WON TO" : "LOST TO"} 
                </Td>

                <Td > 
                    <Link onClick={() => {toggleUserId(value); onOpen()}}>
                        {props.userId === value.winnerId ? value.looserUsername : value.winnerUsername} 
                    </Link>
                </Td>
            </Tr>)
        })}
        </Tbody>
    </Table>
    <ProfileModal userId={adversaryId} isOpen={isOpen} onClose={onClose} onOpen={onOpen} chatSocket={props.chatSocket} gameSock={props.gameSocket}/>
    </>)
}

export default PlayerHistory
