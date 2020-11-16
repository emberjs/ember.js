// import Logger from './logger';

import { LOCAL_LOGGER } from '../index';

// let alreadyWarned = false;

export function debugAssert(test: any, msg: string): asserts test {
  // if (!alreadyWarned) {
  //   alreadyWarned = true;
  //   Logger.warn("Don't leave debug assertions on in public builds");
  // }

  if (!test) {
    throw new Error(msg || 'assertion failure');
  }
}

export function prodAssert() {}

export function deprecate(desc: string) {
  LOCAL_LOGGER.warn(`DEPRECATION: ${desc}`);
}

export default debugAssert;
