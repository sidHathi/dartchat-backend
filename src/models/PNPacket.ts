type PNType = 'message' | 'like' | 'newConvo' | 'addedToConvo';

type PNPacket = {
    type: PNType;
    stringifiedBody: string;
    stringifiedDisplay?: string;
};

export default PNPacket;
