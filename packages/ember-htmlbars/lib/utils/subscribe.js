import { isStream, labelFor } from '../streams/utils';

export default function subscribe(node, env, scope, stream) {
  if (!isStream(stream)) { return; }
  let component = scope.getComponent();
  let unsubscribers = node.streamUnsubscribers = node.streamUnsubscribers || [];

  unsubscribers.push(stream.subscribe(() => {
    node.isDirty = true;

    // Whenever a render node directly inside a component becomes
    // dirty, we want to invoke the willRenderElement and
    // didRenderElement lifecycle hooks. From the perspective of the
    // programming model, whenever anything in the DOM changes, a
    // "re-render" has occured.
    if (component && component._renderNode) {
      component._renderNode.isDirty = true;
    }

    if (node.getState().manager) {
      node.shouldReceiveAttrs = true;
    }

    // When the toplevelView (aka ownerView) is being torn
    // down (generally in tests), `ownerNode.emberView` will be
    // set to `null` (to prevent further work while tearing down)
    // so we need to guard against that case here
    let ownerView = node.ownerNode.emberView;
    if (ownerView) {
      ownerView.scheduleRevalidate(node, labelFor(stream));
    }
  }));
}
