import Message from './Message';
import UserProfile from './UserProfile';

type Conversation = {
    id: string;
    name: string;
    avatar?: any;
    settings: any;
    messages: Message[];
    participants: UserProfile[];
};

export default Conversation;
