/**
@module ember
@submodule ember-htmlbars
*/

export default function destroyRenderNode(renderNode) {
  if (renderNode.emberView) {
    renderNode.emberView.destroy();
  }

  let streamUnsubscribers = renderNode.streamUnsubscribers;
  if (streamUnsubscribers) {
    for (let i = 0; i < streamUnsubscribers.length; i++) {
      streamUnsubscribers[i]();
    }
  }
}
