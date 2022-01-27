import { Owner } from '@ember/-internals/owner';
import { action } from '@ember/object';
import Route from '@ember/routing/route';

class MyRoute extends Route {
  @action
  topLevel(_foo: number, _opt?: boolean) {}

  actions = {
    nested(_foo: string, _opt?: number) {},
  };
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

route.send('nested', 'val');
route.send('nested', 'val', 2);
// @ts-expect-error Requires argument
route.send('nested');
// @ts-expect-error Invalid argument
route.send('nested', false);
