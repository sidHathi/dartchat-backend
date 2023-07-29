import Message from './Message';

type ScheduledMessage = {
    id: string;
    cid: string;
    message: Message;
    time: Date;
};

export default ScheduledMessage;
