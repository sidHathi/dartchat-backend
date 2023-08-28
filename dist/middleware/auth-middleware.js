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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
const firebase_1 = __importDefault(require("../firebase"));
const isAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { authorization } = req.headers;
    if (!authorization)
        return res.status(401).send({ message: 'Unauthorized' });
    if (!authorization.startsWith('Bearer'))
        return res.status(401).send({ message: 'Unauthorized' });
    const split = authorization.split('Bearer ');
    if (split.length !== 2)
        return res.status(401).send({ message: 'Unauthorized' });
    const token = split[1];
    try {
        const decodedToken = yield firebase_1.default.auth().verifyIdToken(token);
        console.log('decodedToken', JSON.stringify(decodedToken));
        res.locals = Object.assign(Object.assign({}, res.locals), { uid: decodedToken.uid, role: decodedToken.role, email: decodedToken.email });
        return next();
    }
    catch (err) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
});
exports.isAuthenticated = isAuthenticated;
exports.default = exports.isAuthenticated;
