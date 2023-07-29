import { DocumentData } from 'firebase-admin/firestore';
import { Query } from 'firebase-admin/firestore';
import { Request } from 'express';

const DEFAULT_PAGE_SIZE = 10;

export type MessageCursor = {
    size: number;
    prevLastVal?: Date;
};

export const initCursor = (lastVal: Date, pageSize?: number): MessageCursor => {
    const size = pageSize || DEFAULT_PAGE_SIZE;
    const prevLastVal = lastVal;
    return {
        size,
        prevLastVal
    };
};

export const getNextCursor = (prevCursor: MessageCursor, newLastVal: Date): MessageCursor => {
    return {
        size: prevCursor.size,
        prevLastVal: newLastVal
    };
};

export const encodeCursor = (cursor: MessageCursor): string => {
    return btoa(JSON.stringify(cursor));
};

export const decodeCursor = (cursor: string): MessageCursor => {
    return Object.fromEntries(
        Object.entries(JSON.parse(atob(cursor))).map(([key, val]) => {
            if (key === 'prevLastVal' && typeof val === 'string') return [key, new Date(Date.parse(val))];
            return [key, val];
        })
    ) as MessageCursor;
};

export const getQueryForCursor = (document: DocumentData | Query, cursor: MessageCursor): Query => {
    if (cursor.prevLastVal) {
        return document.where('timestamp', '<', cursor.prevLastVal).orderBy('timestamp', 'desc').limit(cursor.size);
    }
    return document.orderBy('timestamp', 'desc').limit(cursor.size);
};

export const getCursorForQuery = (req: Request): MessageCursor => {
    if ('cursor' in req.query && req.query.cursor) {
        const encodedCursor = req.query.cursor as string;
        return decodeCursor(encodedCursor);
    }
    let size = DEFAULT_PAGE_SIZE;
    try {
        if ('size' in req.query && req.query.size) {
            size = Number(req.query.size as string);
        }
    } catch (err) {
        console.log(err);
    } finally {
        return {
            size
        };
    }
};
