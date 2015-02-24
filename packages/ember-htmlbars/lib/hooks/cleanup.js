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

  var unsubscribers = state.unsubscribers;
  if (!unsubscribers) { return; }

  for (var i=0, l=unsubscribers.length; i<l; i++) {
    unsubscribers[i]();
  }
}
