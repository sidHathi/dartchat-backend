import AvatarImage from './AvatarImage';
import Message from './Message';
import UserConversationProfile from './UserConversationProfile';

type Conversation = {
    id: string;
    name: string;
    avatar?: AvatarImage;
    settings: any;
    messages: Message[];
    group: boolean;
    participants: UserConversationProfile[];
};

export default Conversation;
