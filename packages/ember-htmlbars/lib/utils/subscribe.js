import { isStream } from "ember-metal/streams/utils";

export default function subscribe(node, scope, stream) {
  if (!isStream(stream)) { return; }
  var component = scope.component;
  var unsubscribers = node.streamUnsubscribers = node.streamUnsubscribers || [];

  unsubscribers.push(stream.subscribe(function() {
    node.isDirty = true;

    if (component && component._renderNode) {
      component._renderNode.isDirty = true;
    }

    if (node.state.manager) {
      node.shouldReceiveAttrs = true;
    }

    node.ownerNode.emberView.scheduleRevalidate();
  }));
}
