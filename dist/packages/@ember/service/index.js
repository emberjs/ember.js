import { FrameworkObject } from '@ember/object/-internals';
import { inject as metalInject } from '@ember/-internals/metal';
export function inject(...args) {
  return metalInject('service', ...args);
}
export function service(...args) {
  return metalInject('service', ...args);
}
/**
  @class Service
  @extends EmberObject
  @since 1.10.0
  @public
*/
class Service extends FrameworkObject {}
Service.isServiceFactory = true;
export default Service;