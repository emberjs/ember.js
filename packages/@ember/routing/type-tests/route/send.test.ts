import type Owner from '@ember/owner';
import { action } from '@ember/object';
import Route from '@ember/routing/route';

class MyRoute extends Route {
  @action
  topLevel(_foo: number, _opt?: boolean) {}
}

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;
let route = new MyRoute(owner);

route.send('topLevel', 1);
route.send('topLevel', 1, true);
// @ts-expect-error Requires argument
route.send('topLevel');
// @ts-expect-error Invalid argument
route.send('topLevel', false);
