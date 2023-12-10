import AvatarImage from './AvatarImage';
import Message from './Message';
import UserConversationProfile from './UserConversationProfile';
import { Poll, CalendarEvent, LikeIcon } from './MessageObjects';
import KeyInfo from './KeyInfo';

type Conversation = {
    id: string;
    name: string;
    settings: any;
    messages: Message[];
    group: boolean;
    participants: UserConversationProfile[];
    avatar?: AvatarImage;
    polls?: Poll[];
    events?: CalendarEvent[];
    customLikeIcon?: LikeIcon;
    publicKey?: string;
    keyInfo?: KeyInfo;
    adminIds?: string[];
    messageDisappearTime?: number; // hours
};

export default Conversation;
