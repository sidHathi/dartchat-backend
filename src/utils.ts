export const cleanUndefinedFields = (obj: any) => {
    return Object.keys(obj).reduce((acc: any, key) => {
        const _acc = acc;
        if (obj[key] !== undefined) _acc[key] = obj[key];
        return _acc;
    }, {});
};

export const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return String(error);
};
