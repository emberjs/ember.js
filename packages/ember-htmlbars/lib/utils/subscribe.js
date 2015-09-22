import { isStream, labelFor } from 'ember-metal/streams/utils';

export default function subscribe(node, env, scope, stream) {
  if (!isStream(stream)) { return; }
  var component = scope.getComponent();
  var unsubscribers = node.streamUnsubscribers = node.streamUnsubscribers || [];

  unsubscribers.push(stream.subscribe(function() {
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

    node.ownerNode.emberView.scheduleRevalidate(node, labelFor(stream));
  }));
}
