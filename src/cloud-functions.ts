import { db } from 'firebase';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Conversation } from 'models';

const conversationsCol = db.collection(process.env.FIREBASE_CONVERSATIONS_COL || 'conversations-dev');

const cullExpiredMessages = async () => {
    try {
        // needs to fetch a list of all conversations, determine which ones have expiring messages, and build a queries to delete expired messages for those conversations
        const relevantConvos = await conversationsCol.where('messageDisappearTime', '!=', 0).get();
        const batch = db.batch();
        relevantConvos.forEach(async (doc) => {
            const convo = doc.data() as Conversation;
            const disappearTime = convo.messageDisappearTime;
            if (!disappearTime) return;

            const threshold = new Date(new Date().getTime() - disappearTime * 1000 * 60 * 60);
            try {
                const messagesToDelete = await conversationsCol
                    .doc(convo.id)
                    .collection('messages')
                    .where('timestamp', '<', threshold)
                    .get();
                messagesToDelete.forEach((messageDoc) => {
                    const ref = messageDoc.ref;
                    batch.delete(ref);
                });
            } catch (err) {
                console.log(err);
                return;
            }
        });
        batch.commit();
        // matchingCols.forEach -> delete messages with difference between createdAt and current time over certain threshold
        return;
    } catch (err) {
        return Promise.reject(err);
    }
};

export const scheduleDelete = onSchedule('0 * * * *', cullExpiredMessages);
