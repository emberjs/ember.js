import { run } from 'ember-metal';

function runAppend(view) {
  run(view, 'appendTo', '#qunit-fixture');
}

function runDestroy(destroyed) {
  if (destroyed) {
    run(destroyed, 'destroy');
  }
}

export {
  runAppend,
  runDestroy
};
