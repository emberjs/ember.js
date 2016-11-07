/**
@module ember
@submodule ember-routing
*/

// ES6TODO: Cleanup modules with side-effects below
import './ext/run_loop';
import './ext/controller';

export { default as Location } from './location/api';
export { default as NoneLocation } from './location/none_location';
export { default as HashLocation } from './location/hash_location';
export { default as HistoryLocation } from './location/history_location';
export { default as AutoLocation } from './location/auto_location';

export {
  default as generateController,
  generateControllerFactory
} from './system/generate_controller';
export { default as controllerFor } from './system/controller_for';
export { default as RouterDSL } from './system/dsl';
export { default as Router } from './system/router';
export { default as Route } from './system/route';
export { default as QueryParams } from './system/query_params';
export { default as RoutingService } from './services/routing';
export { default as BucketCache } from './system/cache';
