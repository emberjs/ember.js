import { registerDeprecationHandler } from '@ember/debug';
import { expectTypeOf } from 'expect-type';
import { DeprecationOptions } from '../lib/deprecate';
import { Handler } from '../lib/handlers';

let ret = registerDeprecationHandler((message, options, next) => {
  expectTypeOf(message).toEqualTypeOf<string>();
  expectTypeOf(options).toEqualTypeOf<DeprecationOptions | undefined>();
  expectTypeOf(next).toEqualTypeOf<Handler<DeprecationOptions>>();

  if (message.indexOf('should') !== -1) {
    throw new Error(`Deprecation message with should: ${message}`);
  } else {
    // defer to whatever handler was registered before this one
    next(message, options);
  }
});
expectTypeOf(ret).toEqualTypeOf<void>();
