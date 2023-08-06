import { db } from '../firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { Conversation, ConversationPreview, UserConversationProfile, UserData } from '../models';
import usersService from './users-service';
import { cleanUndefinedFields } from '../utils/request-utils';

const usersCol = db.collection('users');

const handleKeyUpdateReceipt = async (user: UserData, cids: string[]) => {
    try {
        const updatedUserConvos = user.conversations.map((c) => {
            if (cids.includes(c.cid)) {
                const { keyUpdate, ...preview } = c;
                return cleanUndefinedFields(preview);
            }
            return cleanUndefinedFields(c);
        });
        const updateRes = await usersCol.doc(user.id).update({
            conversations: updatedUserConvos
        });
        if (updateRes) {
            return true;
        }
        return false;
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

const addUserSecretsForNewConversation = async (newConvo: Conversation, userKeyMap: { [key: string]: string }) => {
    try {
        await Promise.all(
            newConvo.participants.map(async (participant) => {
                const user = await usersService.getUser(participant.id);
                const updatedUserPreviews = user.conversations.map((preview) => {
                    let keyUpdate: string | undefined = undefined;
                    if (preview.cid === newConvo.id && user.id in userKeyMap && userKeyMap[user.id] !== undefined) {
                        keyUpdate = userKeyMap[user.id];
                        return cleanUndefinedFields({
                            ...preview,
                            keyUpdate
                        });
                    }
                    return cleanUndefinedFields(preview);
                }) as ConversationPreview[];
                const updateRes = await usersCol.doc(participant.id).update({
                    conversations: updatedUserPreviews
                });
                return updateRes;
            })
        );
        return true;
    } catch (err) {
        return Promise.reject(err);
    }
};

const addUserSecretsForNewParticipants = async (
    cid: string,
    newParticipants: UserConversationProfile[],
    userKeyMap: { [key: string]: string }
) => {
    try {
        await Promise.all(
            newParticipants.map(async (participant) => {
                const user = await usersService.getUser(participant.id);
                const updatedUserPreviews = user.conversations.map((preview) => {
                    let keyUpdate: string | undefined = undefined;
                    if (preview.cid === cid && user.id in userKeyMap && userKeyMap[user.id] !== undefined) {
                        keyUpdate = userKeyMap[user.id];
                        return cleanUndefinedFields({
                            ...preview,
                            keyUpdate
                        });
                    }
                    return cleanUndefinedFields(preview);
                }) as ConversationPreview[];
                const updateRes = await usersCol.doc(participant.id).update({
                    conversations: updatedUserPreviews
                });
                return updateRes;
            })
        );
        return true;
    } catch (err) {
        return Promise.reject(err);
    }
};

const secretsService = {
    handleKeyUpdateReceipt,
    setUserKeySalt,
    setUserSecrets,
    addUserSecretsForNewConversation,
    addUserSecretsForNewParticipants
};

export default secretsService;
