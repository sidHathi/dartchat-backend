"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunk = exports.parsePoll = exports.parseCalEvent = exports.parseDBUserData = exports.parseDBMessage = exports.parseRequestMessage = exports.getErrorMessage = exports.cleanUndefinedFields = void 0;
const cleanUndefinedFields = (obj) => {
    if (!obj)
        return obj;
    return Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined));
};
exports.cleanUndefinedFields = cleanUndefinedFields;
const getErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    return String(error);
};
exports.getErrorMessage = getErrorMessage;
const parseRequestMessage = (message) => {
    if (typeof message.timestamp === 'string') {
        return Object.assign(Object.assign({}, message), { delivered: true, timestamp: new Date(Date.parse(message.timestamp)) });
    }
    return message;
};
exports.parseRequestMessage = parseRequestMessage;
const parseDBMessage = (message) => {
    return Object.assign(Object.assign({}, message), { timestamp: message.timestamp.toDate() });
};
exports.parseDBMessage = parseDBMessage;
const parseDBUserData = (user) => {
    return Object.assign(Object.assign({}, user), { conversations: user.conversations
            ? user.conversations.map((c) => (Object.assign(Object.assign({}, c), { lastMessageTime: c.lastMessageTime.toDate(), lastMessage: c.lastMessage ? (0, exports.parseDBMessage)(c.lastMessage) : undefined })))
            : [] });
};
exports.parseDBUserData = parseDBUserData;
const parseCalEvent = (raw) => {
    return Object.fromEntries(Object.entries(raw).map(([key, val]) => {
        if (key === 'date') {
            return [key, new Date(Date.parse(val))];
        }
        else if (key === 'reminders') {
            return [key, val.map((s) => new Date(Date.parse(s)))];
        }
        return [key, val];
    }));
};
exports.parseCalEvent = parseCalEvent;
const parsePoll = (raw) => {
    return Object.fromEntries(Object.entries(raw).map(([key, val]) => {
        if (key === 'expirationDate') {
            return [key, new Date(Date.parse(val))];
        }
        return [key, val];
    }));
};
exports.parsePoll = parsePoll;
const chunk = (arr, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const arrChunk = arr.slice(i, i + chunkSize);
        chunks.push(arrChunk);
    }
    return chunks;
};
exports.chunk = chunk;
