type PNType =
    | 'message'
    | 'like'
    | 'newConvo'
    | 'addedToConvo'
    | 'secrets'
    | 'deleteMessage'
    | 'roleChanged'
    | 'messageDisappearTimeChanged';

type PNPacket = {
    type: PNType;
    stringifiedBody: string;
    stringifiedDisplay?: string;
};

export default PNPacket;
