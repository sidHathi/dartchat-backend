type PNType = 'message' | 'like' | 'newConvo' | 'addedToConvo' | 'secrets' | 'deleteMessage' | 'roleChanged';

type PNPacket = {
    type: PNType;
    stringifiedBody: string;
    stringifiedDisplay?: string;
};

export default PNPacket;
