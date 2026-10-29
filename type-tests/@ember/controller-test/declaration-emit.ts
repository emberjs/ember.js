import Controller from '@ember/controller';
import { expectTypeOf } from 'expect-type';

/*
  Apps emit declarations, so the types of these exports must be nameable.
  The type check fails with TS4023 if they are not.
*/
export const ExtendedController = Controller.extend({
  foo: 'bar',
});

export const extendedController = ExtendedController.create();

expectTypeOf(extendedController).toMatchTypeOf<Controller>();
