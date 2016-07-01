/**
@module ember
@submodule ember-htmlbars
*/
export default function destroyRenderNode(renderNode) {
  let view = renderNode.emberView;
  if (view) {
    view.renderer.remove(view, true);
  }

  let streamUnsubscribers = renderNode.streamUnsubscribers;
  if (streamUnsubscribers) {
    for (let i = 0; i < streamUnsubscribers.length; i++) {
      streamUnsubscribers[i]();
    }
  }
}
