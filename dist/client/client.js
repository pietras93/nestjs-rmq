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
const events_1 = require("events");
const constants_1 = require("../constants");
const amqp = require("amqp-connection-manager");
class ClientRMQ extends microservices_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.client = null;
        this.channel = null;
        this.urls = this.options.urls || [constants_1.DEFAULT_URL];
        this.queue = this.options.queue || constants_1.DEFAULT_QUEUE;
        this.prefetchCount = this.options.prefetchCount || constants_1.DEFAULT_PREFETCH_COUNT;
        this.isGlobalPrefetchCount = this.options.isGlobalPrefetchCount || constants_1.DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
        this.queueOptions = this.options.queueOptions || constants_1.DEFAULT_QUEUE_OPTIONS;
    }
    close() {
        this.channel && this.channel.close();
        this.client && this.client.close();
    }
    listen() {
        this.channel.addSetup((channel) => {
            return Promise.all([
                channel.consume(this.replyQueue, (msg) => {
                    this.responseEmitter.emit(msg.properties.correlationId, msg);
                }, { noAck: true }),
            ]);
        });
    }
    connect() {
        if (this.client && this.channel) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            this.client = amqp.connect(this.urls);
            this.client.on(constants_1.CONNECT_EVENT, x => {
                this.channel = this.client.createChannel({
                    json: false,
                    setup: (channel) => __awaiter(this, void 0, void 0, function* () {
                        yield channel.assertQueue(this.queue, this.queueOptions);
                        yield channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
                        this.replyQueue = (yield channel.assertQueue('', { exclusive: true })).queue;
                        this.responseEmitter = new events_1.EventEmitter();
                        this.responseEmitter.setMaxListeners(0);
                        this.listen();
                        resolve();
                    }),
                });
            });
            this.client.on(constants_1.DISCONNECT_EVENT, err => {
                reject(err);
                this.client.close();
                this.client = null;
            });
        }));
    }
    publish(messageObj, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.client) {
                    yield this.connect();
                }
                const correlationId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                this.responseEmitter.on(correlationId, msg => {
                    this.handleMessage(msg, callback);
                });
                this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(messageObj)), {
                    replyTo: this.replyQueue,
                    correlationId,
                });
            }
            catch (err) {
                callback(err, null);
            }
        });
    }
    handleMessage(message, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (message) {
                const { content } = message;
                const { err, response, isDisposed } = JSON.parse(content.toString());
                if (isDisposed || err) {
                    callback({
                        err,
                        response: null,
                        isDisposed: true,
                    });
                }
                callback({
                    err,
                    response,
                });
            }
        });
    }
}
exports.ClientRMQ = ClientRMQ;
