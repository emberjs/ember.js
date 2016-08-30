export default function didCleanupTree(env) {
  // Once we have finsihed cleaning up the render node and sub-nodes, reset
  // state tracking which view those render nodes belonged to.
  let queue = env.view.ownerView._destroyingSubtreeForView;
  for (let i = 0; i < queue.length; i++) {
    queue[i](env);
  }
  env.view.ownerView._destroyingSubtreeForView = null;
}
