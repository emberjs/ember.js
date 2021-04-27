import EngineInstance from './instance';
import { EngineInstanceOptions, Factory } from '@ember/-internals/owner';

export function getEngineParent(instance: EngineInstance): EngineInstance | undefined;

export { EngineInstance };

export default class Engine {
  constructor(...args: any[]);
  init(...args: any[]): void;
  register<T, C>(fullName: string, factory: Factory<T, C>, options?: object): void;
  buildInstance(options?: EngineInstanceOptions): EngineInstance;
}
