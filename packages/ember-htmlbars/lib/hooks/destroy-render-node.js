/**
@module ember
@submodule ember-htmlbars
*/

export default function destroyRenderNode(renderNode) {
  if (renderNode.emberView) {
    renderNode.emberView.destroy();
  }

  var streamUnsubscribers = renderNode.streamUnsubscribers;
  if (streamUnsubscribers) {
    for (let i=0, l=streamUnsubscribers.length; i<l; i++) {
      streamUnsubscribers[i]();
    }
  }
}
