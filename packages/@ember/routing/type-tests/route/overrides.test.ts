import { Owner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import { action } from '@ember/object';
import Route from '@ember/routing/route';
import { Transition } from 'router_js';

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;
class Foo {}

class MyRoute extends Route<Foo> {
  resetController(_controller: Controller, _isExiting: boolean, _transition: Transition): this {
    return this;
  }

  @action
  willTransition(_transition: Transition) {}

  @action
  didTransition() {}

  @action
  loading(_transition: Transition, _route: Route<Foo>) {}

  activate(_transition: Transition): void {}

  deactivate(_transition?: Transition): void {}

  beforeModel(_transition: Transition): void {}

  afterModel(_transition: Transition): void {}

  redirect(_transition: Transition): void {}

  model(_params: Record<string, unknown>, _transition: Transition): Foo | Promise<Foo> {
    return new Foo();
  }

  setupController(_controller: Controller, _context: Foo, _transition?: Transition): void {}

  buildRouteInfoMetadata(): void {}

  serialize(_model: Foo | undefined, _params: string[]): { [key: string]: unknown } {
    return {};
  }
}
new MyRoute(owner);
