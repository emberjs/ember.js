// ES6TODO: Cleanup modules with side-effects below
import './lib/ext/controller';

export { default as Location, EmberLocation } from './lib/location/api';
export { default as NoneLocation } from './lib/location/none_location';
export { default as HashLocation } from './lib/location/hash_location';
export { default as HistoryLocation } from './lib/location/history_location';
export { default as AutoLocation } from './lib/location/auto_location';

export {
  default as generateController,
  generateControllerFactory,
} from './lib/system/generate_controller';
export { default as controllerFor } from './lib/system/controller_for';
export { default as RouterDSL } from './lib/system/dsl';
export { default as Router, QueryParam } from './lib/system/router';
export { default as Route } from './lib/system/route';
export { default as QueryParams } from './lib/system/query_params';
export { default as RoutingService } from './lib/services/routing';
export {
  default as RouterService,
  RouteInfo,
  RouteInfoWithAttributes,
} from './lib/services/router';
export { default as RouterState } from './lib/system/router_state';
export { default as BucketCache } from './lib/system/cache';
