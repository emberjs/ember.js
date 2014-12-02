import run from "ember-metal/run_loop";

function appendView(view) {
  run(view, "appendTo", "#qunit-fixture");
}

function destroyView(view) {
  if (view) {
    run(view, "destroy");
  }
}

export {
  appendView,
  destroyView
};
