import Message from './Message';
import UserProfile from './UserProfile';

type Conversation = {
    id: string;
    name: string;
    messages: Message[];
    participants: UserProfile[];
};

export default Conversation;
