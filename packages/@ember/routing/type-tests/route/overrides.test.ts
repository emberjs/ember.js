import type Owner from '@ember/owner';
import type Controller from '@ember/controller';
import { action } from '@ember/object';
import Route from '@ember/routing/route';
import type { Transition } from 'router_js';

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;
class Foo {}

class MyRoute extends Route<Foo> {
  override resetController(_controller: Controller, _isExiting: boolean, _transition: Transition): this {
    return this;
  }

  @action
  override willTransition(_transition: Transition) {}

  @action
  override didTransition() {}

  @action
  override loading(_transition: Transition, _route: Route<Foo>) {}

  override activate(_transition: Transition): void {}

  override deactivate(_transition?: Transition): void {}

  override beforeModel(_transition: Transition): void {}

  override afterModel(_transition: Transition): void {}

  override redirect(_transition: Transition): void {}

  override model(_params: Record<string, unknown>, _transition: Transition): Foo | Promise<Foo> {
    return new Foo();
  }

  override setupController(_controller: Controller, _context: Foo, _transition?: Transition): void {}

  override buildRouteInfoMetadata(): void {}

  override serialize(_model: Foo | undefined, _params: string[]): { [key: string]: unknown } {
    return {};
  }
}
new MyRoute(owner);
