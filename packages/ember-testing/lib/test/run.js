import emberRun from 'ember-metal/run_loop';

export default function run(fn) {
  if (!emberRun.currentRunLoop) {
    return emberRun(fn);
  } else {
    return fn();
  }
}
