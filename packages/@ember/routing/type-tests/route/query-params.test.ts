import { Owner } from '@ember/-internals/owner';
import Route from '@ember/routing/route';

// NOTE: This is invalid, but acceptable for type tests
let owner = {} as Owner;

class MyRoute extends Route {
  queryParams = {
    page: {
      refreshModel: false,
      replace: false,
      as: 'page',
    },
  };
}
new MyRoute(owner);

class InvalidQPs1 extends Route {
  // @ts-expect-error Must be a Record
  queryParams = 1;
}
new InvalidQPs1(owner);

class InvalidQPs2 extends Route {
  // @ts-expect-error Invalid details
  queryParams = { page: true };
}
new InvalidQPs2(owner);

class InvalidQPs3 extends Route {
  // @ts-expect-error Invalid details hash
  queryParams = { page: { refreshModel: 1 } };
}
new InvalidQPs3(owner);
