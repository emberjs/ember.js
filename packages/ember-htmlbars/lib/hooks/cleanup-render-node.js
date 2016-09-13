/**
@module ember
@submodule ember-htmlbars
*/

export default function cleanupRenderNode(renderNode) {
  let view = renderNode.emberView;
  if (view) {
    view.renderer.willDestroyElement(view);
    view.ownerView._destroyingSubtreeForView.push(env => {
      view._transitionTo('destroying'); // unregisters view
      // prevents rerender and scheduling
      view._renderNode = null;
      renderNode.emberView = null;

      view.renderer.didDestroyElement(view);

      if (view.parentView && view.parentView === env.view) {
        view.parentView.removeChild(view);
      }

      view._transitionTo('preRender');
    });
  }

  if (renderNode.cleanup) { renderNode.cleanup(); }
}
