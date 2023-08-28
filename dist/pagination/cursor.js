"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCursorForQuery = exports.getQueryForCursor = exports.decodeCursor = exports.encodeCursor = exports.getNextCursor = exports.initCursor = void 0;
const DEFAULT_PAGE_SIZE = 30;
const initCursor = (lastVal, pageSize) => {
    const size = pageSize || DEFAULT_PAGE_SIZE;
    const prevLastVal = lastVal;
    return {
        size,
        prevLastVal
    };
};
exports.initCursor = initCursor;
const getNextCursor = (prevCursor, newLastVal) => {
    return {
        size: prevCursor.size,
        prevLastVal: newLastVal
    };
};
exports.getNextCursor = getNextCursor;
const encodeCursor = (cursor) => {
    console.log(cursor);
    console.log(Buffer.from(JSON.stringify(cursor)).toString('base64'));
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
};
exports.encodeCursor = encodeCursor;
const decodeCursor = (cursor) => {
    console.log(Buffer.from(cursor, 'base64').toString());
    return Object.fromEntries(Object.entries(JSON.parse(Buffer.from(cursor, 'base64').toString())).map(([key, val]) => {
        if (key === 'prevLastVal' && typeof val === 'string')
            return [key, new Date(Date.parse(val))];
        return [key, val];
    }));
};
exports.decodeCursor = decodeCursor;
const getQueryForCursor = (document, cursor) => {
    if (cursor.prevLastVal) {
        return document.where('timestamp', '<', cursor.prevLastVal).orderBy('timestamp', 'desc').limit(cursor.size);
    }
    return document.orderBy('timestamp', 'desc').limit(cursor.size);
};
exports.getQueryForCursor = getQueryForCursor;
const getCursorForQuery = (req) => {
    if ('cursor' in req.query && req.query.cursor) {
        const encodedCursor = req.query.cursor;
        return (0, exports.decodeCursor)(encodedCursor);
    }
    let size = DEFAULT_PAGE_SIZE;
    try {
        if ('size' in req.query && req.query.size) {
            size = Number(req.query.size);
        }
    }
    catch (err) {
        console.log(err);
        return {
            size
        };
    }
    return {
        size
    };
};
exports.getCursorForQuery = getCursorForQuery;
