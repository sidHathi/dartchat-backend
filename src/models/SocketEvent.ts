type SocketEvent = {
    id: string;
    timestamp: Date;
    type: string;
    metadata?: any;
};

export default SocketEvent;
