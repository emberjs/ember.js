export { default as EngineInstance } from './instance';
export function getEngineParent(instance: EngineInstance): EngineInstance | undefined;

import { EngineInstanceOptions, Factory } from '@ember/-internals/owner';

export default class Engine {
  constructor(...args: any[]);
  init(...args: any[]): void;
  register<T, C>(fullName: string, factory: Factory<T, C>, options?: object): void;
  buildInstance(options?: EngineInstanceOptions): EngineInstance;
}
