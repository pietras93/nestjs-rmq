import { ClientProxy } from '@nestjs/microservices';
import { IClientOptions } from './client.interface';
export declare class ClientRMQ extends ClientProxy {
    private readonly options;
    private client;
    private channel;
    private urls;
    private queue;
    private prefetchCount;
    private isGlobalPrefetchCount;
    private queueOptions;
    private replyQueue;
    private responseEmitter;
    constructor(options: IClientOptions);
    close(): void;
    listen(): void;
    connect(): Promise<any>;
    protected publish(messageObj: any, callback: (err: any, result: any, disposed?: boolean) => void): Promise<void>;
    private handleMessage;
}
