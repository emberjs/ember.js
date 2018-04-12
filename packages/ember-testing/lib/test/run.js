import { getCurrentRunLoop, run as emberRun } from '@ember/runloop';

export default function run(fn) {
  if (!getCurrentRunLoop()) {
    return emberRun(fn);
  } else {
    return fn();
  }
}
