// import Logger from './logger';

import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';

export default function assert(test: unknown, msg: string): asserts test {
  if (LOCAL_DEBUG) {
    if (!test) {
      throw new Error(msg || 'assertion failure');
    }
  }
}

export function deprecate(desc: string) {
  if (LOCAL_DEBUG) {
    LOCAL_LOGGER.warn(`DEPRECATION: ${desc}`);
  }
}

/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOCAL_LOGGER should only be used inside a
 * LOCAL_SHOULD_LOG check.
 *FF
 * It does not alleviate the need to check LOCAL_SHOULD_LOG, which is used
 * for stripping.
 */
export const LOCAL_LOGGER = console;

/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOGGER can be used outside of LOCAL_SHOULD_LOG checks,
 * and is meant to be used in the rare situation where a console.* call is
 * actually appropriate.
 */
export const LOGGER = console;

export function assertNever(value: never, desc = 'unexpected unreachable branch'): never {
  LOGGER.log('unreachable', value);
  LOGGER.log(`${desc} :: ${JSON.stringify(value)} (${value})`);

  throw new Error(`code reached unreachable`);
}
