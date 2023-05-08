import Controller, { ControllerQueryParam, inject } from '@ember/controller';

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
