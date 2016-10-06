import { run } from 'ember-metal';

export function runAppend(view) {
  run(view, 'appendTo', '#qunit-fixture');
}

export function runDestroy(toDestroy) {
  if (toDestroy) {
    run(toDestroy, 'destroy');
  }
}
