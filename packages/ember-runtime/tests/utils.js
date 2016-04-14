import run from 'ember-metal/run_loop';

export function runAppend(view) {
  run(view, 'appendTo', '#qunit-fixture');
}

export function runDestroy(destroyed) {
  if (destroyed) {
    run(destroyed, 'destroy');
  }
}
