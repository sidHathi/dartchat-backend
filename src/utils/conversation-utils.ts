import { AvatarImage, ChatRole, Conversation, UserConversationProfile, UserData } from 'models';
import { cleanUndefinedFields } from './request-utils';

export const parseDBConvo = (convo: any): Conversation => {
    return cleanConversation({
        ...convo,
        keyInfo: convo.keyInfo
            ? {
                  ...convo.keyInfo,
                  createdAt: convo.keyInfo.createdAt.toDate()
              }
            : undefined
    }) as Conversation;
};

export const cleanConversation = (convo: Conversation): Conversation => {
    if (!convo.group) {
        return cleanUndefinedFields({
            ...convo,
            avatar: undefined
        }) as Conversation;
    }
    return cleanUndefinedFields(convo) as Conversation;
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

export const getProfileForUser = (user: UserData, displayName?: string): UserConversationProfile => {
    return {
        id: user.id,
        handle: user.handle,
        displayName: displayName || user.displayName || user.handle,
        avatar: user.avatar,
        notifications: 'all',
        publicKey: user.publicKey
    };
};

export const hasPermissionForAction = (
    action: 'removeUser' | 'changeUserRole' | 'deleteForeignMessage',
    actorRole?: ChatRole,
    recipientRole?: ChatRole
) => {
    switch (action) {
        case 'removeUser':
            if (actorRole === 'admin') return true;
            else if (recipientRole !== 'admin') return true;
            return false;
        case 'changeUserRole':
            if (actorRole === 'admin') return true;
            else if (recipientRole !== 'admin') return true;
            return false;
        case 'deleteForeignMessage':
            if (actorRole === 'admin') return true;
            return false;
    }
};
