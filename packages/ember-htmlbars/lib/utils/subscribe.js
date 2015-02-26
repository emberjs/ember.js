import { isStream } from "ember-metal/streams/utils";

export default function subscribe(node, scope, stream) {
  if (!isStream(stream)) { return; }
  var component = scope.component;
  var unsubscribers = node.state.unsubscribers = node.state.unsubscribers || [];

  unsubscribers.push(stream.subscribe(function() {
    node.isDirty = true;

    if (component && component.renderNode) {
      component.renderNode.isDirty = true;
    }

    if (node.state.componentNode) {
      node.state.shouldReceiveAttrs = true;
    }

    node.ownerNode.state.view.scheduleRevalidate();
  }));
}
