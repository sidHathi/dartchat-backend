import AvatarImage from './AvatarImage';
import Message from './Message';
import UserConversationProfile from './UserConversationProfile';
import { Poll, CalendarEvent } from './MessageObjects';

type Conversation = {
    id: string;
    name: string;
    avatar?: AvatarImage;
    settings: any;
    messages: Message[];
    group: boolean;
    participants: UserConversationProfile[];
    polls?: Poll[];
    events?: CalendarEvent[];
};

export default Conversation;
