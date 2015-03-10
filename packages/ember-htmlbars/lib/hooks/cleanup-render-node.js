/**
@module ember
@submodule ember-htmlbars
*/

export default function cleanupRenderNode(renderNode) {
  if (renderNode.cleanup) { renderNode.cleanup(); }
}
