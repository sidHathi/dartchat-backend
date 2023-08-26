import { db } from '../firebase';
import {
    Conversation,
    ConversationPreview,
    DBUserData,
    KeyInfo,
    Message,
    UserConversationProfile,
    UserData
} from '../models';
import usersService from './users-service';
import { cleanUndefinedFields, parseDBUserData } from '../utils/request-utils';
import { EncryptedMessage } from 'models/Message';

const usersCol = db.collection('users');
const conversationsCol = db.collection('conversations');

const handleKeyUpdateReceipt = async (user: UserData, cids: string[]) => {
    try {
        return true;
        // const updatedUserConvos = user.conversations.map((c) => {
        //     if (cids.includes(c.cid)) {
        //         const { keyUpdate, ...preview } = c;
        //         return cleanUndefinedFields(preview);
        //     }
        //     return cleanUndefinedFields(c);
        // });
        // const updateRes = await usersCol.doc(user.id).update({
        //     conversations: updatedUserConvos
        // });
        // if (updateRes) {
        //     return true;
        // }
        // return false;
    } catch (err) {
        console.log(err);
        return false;
    }
};

const setUserKeySalt = async (uid: string, salt: string) => {
    try {
        const updateRes = usersCol.doc(uid).update({
            keySalt: salt
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const setUserSecrets = async (uid: string, secrets: string) => {
    try {
        const updateRes = usersCol.doc(uid).update({
            secrets
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const performKeyUpdate = async (
    cid: string,
    users: UserConversationProfile[],
    userKeyMap: { [id: string]: string },
    newPublicKey: string
) => {
    try {
        const updateBatch = db.batch();
        await Promise.all(
            users.map(async (participant) => {
                const userDoc = await usersCol.doc(participant.id).get();
                const user = parseDBUserData(userDoc.data() as DBUserData);
                const updatedUserPreviews = user.conversations.map((preview) => {
                    if (
                        preview.cid === cid &&
                        participant.id in userKeyMap &&
                        userKeyMap[participant.id] !== undefined
                    ) {
                        const keyUpdate = userKeyMap[participant.id];
                        return cleanUndefinedFields({
                            ...preview,
                            keyUpdate,
                            publicKey: newPublicKey
                        });
                    }
                    return cleanUndefinedFields(preview);
                }) as ConversationPreview[];
                updateBatch.update(userDoc.ref, {
                    conversations: updatedUserPreviews
                });
            })
        );
        await updateBatch.commit();
    } catch (err) {
        return Promise.reject(err);
    }
};

const addUserSecretsForNewConversation = async (
    newConvo: Conversation,
    uid: string,
    userKeyMap: { [key: string]: string }
) => {
    try {
        if (newConvo.publicKey) {
            await performKeyUpdate(newConvo.id, newConvo.participants, userKeyMap, newConvo.publicKey);
        }
        await conversationsCol.doc(newConvo.id).update({
            keyInfo: {
                createdAt: new Date(),
                privilegedUsers: [uid, ...Object.keys(userKeyMap)] || [],
                numberOfMessages: 0
            }
        });
        return true;
    } catch (err) {
        return Promise.reject(err);
    }
};

const addUserSecretsForNewParticipants = async (
    convo: Conversation,
    newParticipants: UserConversationProfile[],
    userKeyMap: { [key: string]: string }
) => {
    try {
        if (convo.publicKey) {
            await performKeyUpdate(convo.id, newParticipants, userKeyMap, convo.publicKey);
        }

        const currentKeyInfo = convo.keyInfo;
        if (currentKeyInfo) {
            await conversationsCol.doc(convo.id).update({
                keyInfo: {
                    ...currentKeyInfo,
                    privilegedUsers: [...currentKeyInfo.privilegedUsers, ...Object.keys(userKeyMap)]
                }
            });
        }
        return true;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getReencryptionFieldsForMessageList = (messages: Message[]) => {
    try {
        let minDate = new Date();
        const encryptionFields = messages
            .map((message) => {
                if (message.encryptionLevel === 'none' || !message.senderProfile || !message.senderProfile.publicKey) {
                    return undefined;
                }
                if (message.timestamp < minDate) minDate = message.timestamp;
                const encrytped = message as EncryptedMessage;
                return {
                    id: encrytped.id,
                    encryptedFields: encrytped.encryptedFields,
                    publicKey: encrytped.senderProfile?.publicKey as string
                };
            })
            .filter((m) => m !== undefined);
        return {
            data: encryptionFields,
            minDate
        };
    } catch (err) {
        return Promise.reject(err);
    }
};

const changeEncryptionKey = async (
    convo: Conversation,
    publicKey: string,
    senderId: string,
    userKeyMap: { [id: string]: string },
    keyInfo?: KeyInfo
) => {
    try {
        await conversationsCol.doc(convo.id).update({
            publicKey: publicKey,
            keyInfo: keyInfo || {
                createdAt: new Date(),
                privilegedUsers: [senderId, ...Object.keys(userKeyMap)],
                numberOfMessages: 0
            }
        });
        await performKeyUpdate(convo.id, convo.participants, userKeyMap, publicKey);
        return true;
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const updateKeyInfoForMessage = async (convo: Conversation) => {
    try {
        if (!convo.keyInfo) return;
        await conversationsCol.doc(convo.id).update({
            keyInfo: {
                ...convo.keyInfo,
                numberOfMessages: convo.keyInfo.numberOfMessages + 1
            }
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

const updateKeyInfoForReencryption = async (convo: Conversation, numMessages: number) => {
    try {
        if (!convo.keyInfo) return;
        await conversationsCol.doc(convo.id).update({
            keyInfo: {
                ...convo.keyInfo,
                numberOfMessages: convo.keyInfo.numberOfMessages + numMessages
            }
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

const addKeyInfo = async (convo: Conversation) => {
    try {
        const keyInfo: KeyInfo = {
            createdAt: new Date(),
            privilegedUsers: convo.participants.map((p) => p.id),
            numberOfMessages: 0
        };
        await conversationsCol.doc(convo.id).update({
            keyInfo
        });
        return keyInfo;
    } catch (err) {
        return Promise.reject(err);
    }
};

const secretsService = {
    handleKeyUpdateReceipt,
    setUserKeySalt,
    setUserSecrets,
    addUserSecretsForNewConversation,
    addUserSecretsForNewParticipants,
    getReencryptionFieldsForMessageList,
    changeEncryptionKey,
    updateKeyInfoForMessage,
    updateKeyInfoForReencryption,
    addKeyInfo
};

export default secretsService;
