import { run } from '@ember/runloop';

export function runAppend(view: any) {
  run(view, 'appendTo', document.getElementById('qunit-fixture'));
}

export function runDestroy(toDestroy: any) {
  if (toDestroy) {
    run(toDestroy, 'destroy');
  }
}
