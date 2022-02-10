import { Owner } from '@ember/-internals/owner';
import { FrameworkObject } from '@ember/-internals/runtime';
import EmberObject from '@ember/object';
import Service, { inject, service } from '@ember/service';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

class MainService extends Service {}
class FooService extends Service {}
class BarService extends Service {}
class BazService extends Service {}

let mainService = new MainService(owner);

expectTypeOf(mainService).toMatchTypeOf<FrameworkObject>();

expectTypeOf(Service.isServiceFactory).toEqualTypeOf<boolean>();

expectTypeOf(inject()).toEqualTypeOf<PropertyDecorator>();
expectTypeOf(inject('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo extends EmberObject {
  @inject('main') declare main: MainService;
  @inject declare foo: FooService;
  @service('bar') declare bar: BarService;
  @service declare baz: BazService;
}
new Foo(owner);

const Legacy = EmberObject.extend({
  main: inject('main'),
  foo: inject(),
  bar: service('bar'),
  baz: service(),
});
Legacy.create();
