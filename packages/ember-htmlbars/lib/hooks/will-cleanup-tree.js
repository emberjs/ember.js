export default function willCleanupTree(env, morph) {
  var view = morph.emberView;
  if (view && view.parentView) {
    view.parentView.removeChild(view);
  }

  if (view = env.view) {
    view.ownerView.isDestroyingSubtree = true;
  }
}
