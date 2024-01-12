export interface MessageData {
    id: number;
    author: {id: string, username: string};
    content: string;
    room :{id : number}
    sendAt: Date;
};

export interface Room {
    id: number,
    name: string,
    type : 'gm' | 'dm',
    message: MessageData[]
}
