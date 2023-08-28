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
const findProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!('qString' in req.query)) {
            res.status(422).send('Missing query string');
            throw new Error('Missing query string');
        }
        const qString = (req.query.qString || '');
        const results = yield services_1.profileService.profileSearch(qString);
        res.status(200).send(results);
    }
    catch (err) {
        next(err);
    }
});
const getProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const profile = yield services_1.profileService.getProfile(id);
        res.status(200).send(profile);
    }
    catch (err) {
        const message = (0, request_utils_1.getErrorMessage)(err);
        if (message === 'No user found for given id') {
            res.status(404).send(message);
        }
        next(err);
    }
});
const getProfiles = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ids = req.body;
        if (!ids) {
            res.status(404).send();
            return;
        }
        const profiles = yield services_1.profileService.getProfiles(ids);
        res.status(200).send(profiles);
    }
    catch (err) {
        next(err);
    }
});
const profilesController = {
    findProfile,
    getProfile,
    getProfiles
};
exports.default = profilesController;
