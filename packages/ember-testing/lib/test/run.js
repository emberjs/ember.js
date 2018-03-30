import { run as emberRun, getCurrentRunLoop } from 'ember-metal';

export default function run(fn) {
  if (!getCurrentRunLoop()) {
    return emberRun(fn);
  } else {
    return fn();
  }
}
