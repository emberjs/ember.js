import { registerWarnHandler } from '@ember/debug';
import { expectTypeOf } from 'expect-type';
import { Handler } from '../lib/handlers';
import { WarnOptions } from '../lib/warn';

let ret = registerWarnHandler((message, options, next) => {
  expectTypeOf(message).toEqualTypeOf<string>();
  expectTypeOf(options).toEqualTypeOf<WarnOptions | undefined>();
  expectTypeOf(next).toEqualTypeOf<Handler<WarnOptions>>();

  if (message.indexOf('should') !== -1) {
    throw new Error(`Warn message with should: ${message}`);
  } else {
    // defer to whatever handler was registered before this one
    next(message, options);
  }
});
expectTypeOf(ret).toEqualTypeOf<void>();
