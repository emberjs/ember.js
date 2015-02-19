/**
@module ember
@submodule ember-htmlbars
*/

export default function cleanup(renderNode) {
  if (renderNode.state.view) {
    var view = renderNode.state.view;
    view.destroy();
  }

  var unsubscribers = renderNode.state.unsubscribers;
  if (!unsubscribers) { return; }

  for (var i=0, l=unsubscribers.length; i<l; i++) {
    unsubscribers[i]();
  }
}
