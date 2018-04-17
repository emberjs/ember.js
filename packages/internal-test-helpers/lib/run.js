import { run } from '@ember/runloop';

export function runAppend(view) {
  run(view, 'appendTo', document.getElementById('qunit-fixture'));
}

export function runDestroy(toDestroy) {
  if (toDestroy) {
    run(toDestroy, 'destroy');
  }
}
