"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const microservices_1 = require("@nestjs/microservices");
const constants_1 = require("../constants");
const amqp = require("amqp-connection-manager");
const os_1 = require("os");
class ServerRMQ extends microservices_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.server = null;
        this.channel = null;
        this.urls = this.options.urls || [constants_1.DEFAULT_URL];
        this.queue = this.options.queue || constants_1.DEFAULT_QUEUE;
        this.prefetchCount = this.options.prefetchCount || constants_1.DEFAULT_PREFETCH_COUNT;
        this.isGlobalPrefetchCount = this.options.isGlobalPrefetchCount || constants_1.DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
        this.queueOptions = this.options.queueOptions || constants_1.DEFAULT_QUEUE_OPTIONS;
    }
    listen(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.start(callback);
        });
    }
    close() {
        this.channel && this.channel.close();
        this.server && this.server.close();
    }
    start(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.server = amqp.connect(this.urls);
            this.server.on(constants_1.CONNECT_EVENT, () => {
                this.channel = this.server.createChannel({
                    json: false,
                    setup: (channel) => __awaiter(this, void 0, void 0, function* () {
                        yield channel.assertQueue(this.queue, this.queueOptions);
                        yield channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
                        channel.consume(this.queue, (msg) => this.handleMessage(msg), { noAck: true });
                        if (callback instanceof Function) {
                            callback();
                        }
                    }),
                });
            });
            this.server.on(constants_1.DISCONNECT_EVENT, err => {
                this.logger.error(constants_1.DISCONNECT_MESSAGE);
            });
        });
    }
    handleMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { content, properties } = message;
            const messageObj = JSON.parse(content.toString());
            const handlers = this.getHandlers();
            const pattern = JSON.stringify(messageObj.pattern);
            if (!this.messageHandlers[pattern]) {
                return;
            }
            const handler = this.messageHandlers[pattern];
            const response$ = this.transformToObservable(yield handler(messageObj.data));
            response$ && this.send(response$, (data) => this.sendMessage(data, properties.replyTo, properties.correlationId));
        });
    }
    sendMessage(message, replyTo, correlationId) {
        const hosts = [os_1.hostname()];
        if (message.response) {
            message.response.hosts = message.response.hosts ? message.response.hosts.concat(hosts) : hosts;
        }
        const buffer = Buffer.from(JSON.stringify(message));
        this.channel.sendToQueue(replyTo, buffer, { correlationId });
    }
}
exports.ServerRMQ = ServerRMQ;
