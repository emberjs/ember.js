import { _getCurrentRunLoop, run as emberRun } from '@ember/runloop';
export default function run(fn) {
  if (!_getCurrentRunLoop()) {
    return emberRun(fn);
  } else {
    return fn();
  }
}