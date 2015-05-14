export default function didCleanupTree(env) {
  var view;
  if (view = env.view) {
    view.ownerView.isDestroyingSubtree = false;
  }
}
