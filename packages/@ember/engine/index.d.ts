import { Owner, LookupOptions, Factory, EngineInstanceOptions } from '@ember/-internals/owner';
import EngineInstance from './instance';

export default class Engine {
  constructor(...args: any[]);
  init(...args: any[]): void;
  register<T, C>(fullName: string, factory: Factory<T, C>, options?: object): void;
  buildInstance(options?: EngineInstanceOptions): EngineInstance;
}
