import Controller, { ControllerQueryParam, inject } from '@ember/controller';
import { expectTypeOf } from 'expect-type';
import type Owner from '@ember/owner';

class FirstController extends Controller {
  foo = 'bar';
  @inject declare second: InstanceType<typeof SecondController>;
  @inject declare otherSecond: InstanceType<typeof SecondController>;
  @inject('second') declare moreSecond: InstanceType<typeof SecondController>;

  queryParams = [
    'category',
    {
      searchTerm: {
        type: 'number',
      },
    },
    {
      subCategory: 'sub-category',
    },
  ] as const;

  first() {
    return '';
  }
}
const SecondController = Controller.extend({
  foo: 'bar',

  second() {
    return '';
  },
});

declare module '@ember/controller' {
  interface Registry {
    first: FirstController;
    second: InstanceType<typeof SecondController>;
  }
}

const owner = {} as Owner;

expectTypeOf(owner.lookup('controller:first')).toEqualTypeOf<FirstController>();
expectTypeOf(owner.lookup('controller:second')).toEqualTypeOf<InstanceType<typeof SecondController>>();
expectTypeOf(owner.lookup('controller:non-registered')).toEqualTypeOf<Controller | undefined>();
