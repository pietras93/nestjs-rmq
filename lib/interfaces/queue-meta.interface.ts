export interface IQueueMeta {
	topic: string;
	methodName: string;
	target: any;
	ackBefore: boolean;
	unbind: boolean;
}
