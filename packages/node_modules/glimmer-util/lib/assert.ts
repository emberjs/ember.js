import Logger from './logger';

let alreadyWarned = false;
export function debugAssert(test, msg) {
  if (!alreadyWarned) {
    alreadyWarned = true;
    Logger.warn("Don't leave debug assertions on in public builds");
  }

  if (!test) {
    throw new Error(msg || "assertion failure");
  }
}

export function prodAssert() {}

export default debugAssert;