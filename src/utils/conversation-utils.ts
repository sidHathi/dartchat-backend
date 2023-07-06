import { AvatarImage, Conversation } from 'models';
import { cleanUndefinedFields } from './request-utils';

export const cleanConversation = (convo: Conversation) => {
    if (convo.participants.length <= 2) {
        return cleanUndefinedFields({
            ...convo,
            avatar: undefined
        });
    } else if (convo.participants.length > 2) {
        return cleanUndefinedFields(convo);
    }
};

export const getUserConversationAvatar = (convo: Conversation, userId: string): AvatarImage | undefined => {
    if (convo.participants.length > 2) {
        return convo.avatar;
    }
    const otherUsers = convo.participants.filter((p) => p.id !== userId);
    if (otherUsers.length > 0) {
        console.log(otherUsers[0].avatar);
        return otherUsers[0].avatar;
    }
    return undefined;
};
