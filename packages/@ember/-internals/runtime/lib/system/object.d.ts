import CoreObject from './core_object';
import { Observable } from '../mixins/observable';

interface EmberObject extends CoreObject, Observable {}
declare class EmberObject extends CoreObject {}

interface FrameworkObject extends CoreObject, Observable {}
declare class FrameworkObject extends CoreObject {
  /** @internal */
  _debugContainerKey: string | undefined;
}

export { FrameworkObject, EmberObject as default };
