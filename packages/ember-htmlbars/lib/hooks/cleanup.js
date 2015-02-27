/**
@module ember
@submodule ember-htmlbars
*/

export default function cleanup(renderNode) {
  var state = renderNode.state;
  if (!state) { return; }

  if (state.view) {
    var view = state.view;
    view.destroy();
  }

  var i, l;

  if (state.toDestroy) {
    var toDestroy = state.toDestroy;

    for (i=0, l=toDestroy.length; i<l; i++) {
      toDestroy[i].destroy();
    }

    state.toDestroy = null;
  }

  var unsubscribers = state.unsubscribers;
  if (!unsubscribers) { return; }

  for (i=0, l=unsubscribers.length; i<l; i++) {
    unsubscribers[i]();
  }
}
