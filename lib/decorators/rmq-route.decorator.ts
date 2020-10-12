import { RMQ_ROUTES_META } from '../constants';
import { IQueueMeta } from '../interfaces/queue-meta.interface';
import { RMQService } from '../rmq.service';

export const RMQRoute = (topic: string, ackOnRead: boolean = false) => {
	return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
		let routes: IQueueMeta[] = Reflect.getMetadata(RMQ_ROUTES_META, RMQService);
		if (!routes) {
			routes = [];
		}
		routes.push({ topic, methodName, target, ackOnRead });
		Reflect.defineMetadata(RMQ_ROUTES_META, routes, RMQService);
	};
};
