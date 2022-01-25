import CoreObject from './core_object';
import { Observable } from '../mixins/observable';

interface EmberObject extends CoreObject, Observable {}
declare class EmberObject extends CoreObject {}
export { EmberObject as default };

export class FrameworkObject extends CoreObject {
  /** @internal */
  _debugContainerKey: string | undefined;
}
