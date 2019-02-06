import { Arguments, VM } from '@glimmer/runtime';
import { ACTION, UnboundReference } from '../utils/references';

export default function logAction(_vm: VM, args: Arguments) {
  let { positional } = args;
  let capturedArgs = positional.capture();

  const fn = function() {
    let allArgs = capturedArgs.value().concat(...arguments);

    /* eslint-disable no-console */
    console.log(...allArgs);
    /* eslint-enable no-console */
  };

  fn[ACTION] = true;

  return new UnboundReference(fn);
}
