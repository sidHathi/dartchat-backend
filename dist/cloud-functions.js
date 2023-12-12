"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleDelete = void 0;
const firebase_1 = require("firebase");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const conversationsCol = firebase_1.db.collection(process.env.FIREBASE_CONVERSATIONS_COL || 'conversations-dev');
const cullExpiredMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const relevantConvos = yield conversationsCol.where('messageDisappearTime', '!=', 0).get();
        const batch = firebase_1.db.batch();
        relevantConvos.forEach((doc) => __awaiter(void 0, void 0, void 0, function* () {
            const convo = doc.data();
            const disappearTime = convo.messageDisappearTime;
            if (!disappearTime)
                return;
            const threshold = new Date(new Date().getTime() - disappearTime * 1000 * 60 * 60);
            try {
                const messagesToDelete = yield conversationsCol
                    .doc(convo.id)
                    .collection('messages')
                    .where('timestamp', '<', threshold)
                    .get();
                messagesToDelete.forEach((messageDoc) => {
                    const ref = messageDoc.ref;
                    batch.delete(ref);
                });
            }
            catch (err) {
                console.log(err);
                return;
            }
        }));
        batch.commit();
        return;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
exports.scheduleDelete = (0, scheduler_1.onSchedule)('0 * * * *', cullExpiredMessages);
