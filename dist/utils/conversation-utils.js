"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermissionForAction = exports.getProfileForUser = exports.getUserConversationAvatar = exports.cleanConversation = exports.parseDBConvo = void 0;
const request_utils_1 = require("./request-utils");
const parseDBConvo = (convo) => {
    const safeConvo = (0, request_utils_1.cleanUndefinedFields)(convo);
    if (!safeConvo)
        return convo;
    return (0, exports.cleanConversation)(Object.assign(Object.assign({}, safeConvo), { keyInfo: safeConvo.keyInfo
            ? Object.assign(Object.assign({}, safeConvo.keyInfo), { createdAt: safeConvo.keyInfo.createdAt.toDate() }) : undefined }));
};
exports.parseDBConvo = parseDBConvo;
const cleanConversation = (convo) => {
    if (!convo.group) {
        return (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, convo), { avatar: undefined }));
    }
    return (0, request_utils_1.cleanUndefinedFields)(Object.assign({}, convo));
};
exports.cleanConversation = cleanConversation;
const getUserConversationAvatar = (convo, userId) => {
    if (convo.participants.length > 2) {
        return convo.avatar;
    }
    const otherUsers = convo.participants.filter((p) => p.id !== userId);
    if (otherUsers.length > 0) {
        return otherUsers[0].avatar;
    }
    return undefined;
};
exports.getUserConversationAvatar = getUserConversationAvatar;
const getProfileForUser = (user, displayName) => {
    return {
        id: user.id,
        handle: user.handle,
        displayName: displayName || user.displayName || user.handle,
        avatar: user.avatar,
        notifications: 'all',
        publicKey: user.publicKey
    };
};
exports.getProfileForUser = getProfileForUser;
const hasPermissionForAction = (action, actorRole, recipientRole) => {
    switch (action) {
        case 'removeUser':
            if (actorRole === 'admin')
                return true;
            else if (recipientRole !== 'admin')
                return true;
            return false;
        case 'changeUserRole':
            if (actorRole === 'admin')
                return true;
            else if (recipientRole !== 'admin')
                return true;
            return false;
        case 'deleteForeignMessage':
            if (actorRole === 'admin')
                return true;
            return false;
    }
};
exports.hasPermissionForAction = hasPermissionForAction;
