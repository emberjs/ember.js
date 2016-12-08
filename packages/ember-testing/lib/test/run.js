import { run as emberRun } from 'ember-metal';

export default function run(fn) {
  if (!emberRun.currentRunLoop) {
    return emberRun(fn);
  } else {
    return fn();
  }
}
