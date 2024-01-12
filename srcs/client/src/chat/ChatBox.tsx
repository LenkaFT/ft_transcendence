import React, { useEffect, useState } from "react";
import { Room } from "./interfaces/interface";
import { Socket } from "socket.io-client";
import DmRoom from "./dms/DmChatbox";
import Channel from "./channels/Channel";


function ChatBox(props : {isDm : boolean, room : Room, gameSocket : Socket, chatSocket : Socket, setTargetRoom : Function}) {

    const [channelSwitch, setChannelSwitch] = useState('');

    useEffect(() => {
        setChannelSwitch(props.room?.name)
    }, [props.room])

    return (<>
        {props.isDm && <DmRoom room={props.room} gameSocket={props.gameSocket} chatSocket={props.chatSocket}/>}
        {!props.isDm && <Channel room={props.room} gameSocket={props.gameSocket} chatSocket={props.chatSocket} setTargetChannel={props.setTargetRoom}/>}
    </>)
}

export default ChatBox