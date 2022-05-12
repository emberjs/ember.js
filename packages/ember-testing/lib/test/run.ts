import { _getCurrentRunLoop, run as emberRun } from '@ember/runloop';

export default function run<T>(fn: () => T): T {
  if (!_getCurrentRunLoop()) {
    return emberRun(fn);
  } else {
    return fn();
  }
}
