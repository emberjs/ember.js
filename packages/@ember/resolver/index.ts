import type { Resolver as ResolverContract, Factory } from '@ember/owner';
export default class Resolver implements ResolverContract {
  static create() {
    return new this();
  }

  resolve(_name: string): Factory<object> | object | undefined {
    return undefined;
  }
}
