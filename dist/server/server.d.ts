import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { IServerOptions } from './server.interface';
export declare class ServerRMQ extends Server implements CustomTransportStrategy {
    private readonly options;
    private server;
    private channel;
    private urls;
    private queue;
    private prefetchCount;
    private queueOptions;
    private isGlobalPrefetchCount;
    constructor(options: IServerOptions);
    listen(callback?: () => void): Promise<void>;
    close(): void;
    private start;
    private handleMessage;
    private sendMessage;
}
