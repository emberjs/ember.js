import { ExpectDeprecationFunc } from './ember-dev/deprecation';
import { Message } from './ember-dev/utils';

declare let expectDeprecation: ExpectDeprecationFunc;

export default function maybeExpectDeprecation(
  featureFlag: boolean | null,
  callback: () => void,
  message: Message
): void {
  if (featureFlag) {
    expectDeprecation(callback, message);
  } else {
    callback();
  }
}
