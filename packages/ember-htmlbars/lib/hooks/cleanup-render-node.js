/**
@module ember
@submodule ember-htmlbars
*/

export default function cleanupRenderNode(renderNode) {
  var state = renderNode.state;
  if (!state) { return; }

  if (state.view) {
    var view = state.view;
    view.destroy();
  }

  if (state.toDestroy) {
    var toDestroy = state.toDestroy;

    for (var i=0, l=toDestroy.length; i<l; i++) {
      toDestroy[i].destroy();
    }

    state.toDestroy = [];
  }
}
