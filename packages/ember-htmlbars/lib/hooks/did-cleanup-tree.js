export default function didCleanupTree(env) {
  // Once we have finsihed cleaning up the render node and sub-nodes, reset
  // state tracking which view those render nodes belonged to.
  env.view.ownerView._destroyingSubtreeForView = null;
}
