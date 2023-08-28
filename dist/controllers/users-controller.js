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
const services_1 = require("../services");
const request_utils_1 = require("../utils/request-utils");
const getCurrentUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = res.locals) === null || _a === void 0 ? void 0 : _a.uid;
        const userRes = yield services_1.usersService.getUser(userId);
        res.status(200).send(userRes);
    }
    catch (err) {
        if ((0, request_utils_1.getErrorMessage)(err) === 'User does not exist') {
            res.status(404).send('User does not exist');
        }
        next(err);
    }
});
const createNewUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const userId = (_b = res.locals) === null || _b === void 0 ? void 0 : _b.uid;
        const body = req.body;
        const userRes = yield services_1.usersService.createNewUser(userId, body);
        res.status(201).send(userRes);
    }
    catch (err) {
        if ((0, request_utils_1.getErrorMessage)(err) === 'Handle taken') {
            res.status(409).send('Handle taken');
        }
        else if ((0, request_utils_1.getErrorMessage)(err) === 'Phone number in use') {
            res.status(409).send('Phone number in use');
        }
        next(err);
    }
});
const modifyCurrentUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const userId = (_c = res.locals) === null || _c === void 0 ? void 0 : _c.uid;
        const body = req.body;
        const userRes = yield services_1.usersService.updateUser(userId, body);
        if ('avatar' in body || 'displayName' in body) {
            yield services_1.usersService.updateConversationsForNewUserDetails(userRes);
        }
        res.status(200).send(userRes);
    }
    catch (err) {
        if ((0, request_utils_1.getErrorMessage)(err) === 'Handle taken') {
            res.status(409).send('Handle taken');
        }
        else if ((0, request_utils_1.getErrorMessage)(err) === 'Phone number in use') {
            res.status(409).send('Phone number in use');
        }
        next(err);
    }
});
const updatePushTokens = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = res.locals.uid;
        const newToken = req.body.token;
        if (yield services_1.usersService.updatePushNotificationTokens(newToken, userId)) {
            res.status(200).send();
            return;
        }
        res.status(400).send('token already added');
    }
    catch (err) {
        next(err);
    }
});
const archiveRemove = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = res.locals.uid;
        const cid = req.params.id;
        const updateRes = yield services_1.usersService.removeConvoFromArchive(cid, uid);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('No such conversation in archive');
    }
    catch (err) {
        next(err);
    }
});
const readKeyUpdates = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = res.locals.uid;
        const cids = req.body.cids;
        const user = yield services_1.usersService.getUser(uid);
        if (yield services_1.secretsService.handleKeyUpdateReceipt(user, cids)) {
            res.status(200).send();
            return;
        }
        res.status(400).send('unable to complete key update');
    }
    catch (err) {
        next(err);
    }
});
const setKeySalt = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = res.locals.uid;
        const salt = req.body.salt;
        if (salt && (yield services_1.secretsService.setUserKeySalt(uid, salt))) {
            res.status(200).send();
            return;
        }
        res.status(400).send();
    }
    catch (err) {
        next(err);
    }
});
const setSecrets = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = res.locals.uid;
        const secrets = req.body.secrets;
        if (secrets && (yield services_1.secretsService.setUserSecrets(uid, secrets))) {
            res.status(200).send();
            return;
        }
        res.status(400).send();
    }
    catch (err) {
        next(err);
    }
});
const updatePublicKey = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = res.locals.uid;
        const newKey = req.body.publicKey;
        const userUpdateRes = yield services_1.usersService.setUserPublicKey(uid, newKey);
        const profileUpdateRes = yield services_1.profileService.updatePublicKey(uid, newKey);
        if (userUpdateRes && profileUpdateRes) {
            res.status(200).send();
            return;
        }
        res.status(400).send();
    }
    catch (err) {
        next(err);
    }
});
const usersController = {
    getCurrentUser,
    createNewUser,
    modifyCurrentUser,
    updatePushTokens,
    archiveRemove,
    readKeyUpdates,
    setKeySalt,
    setSecrets,
    updatePublicKey
};
exports.default = usersController;
