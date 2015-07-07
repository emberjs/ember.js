export default function willCleanupTree(env) {
  let view = env.view;

  // When we go to clean up the render node and all of its children, we may
  // encounter views/components associated with those nodes along the way. In
  // those cases, we need to make sure we need to sever the link between the
  // existing view hierarchy and those views.
  //
  // However, we do *not* need to remove the child views of child views, since
  // severing the connection to their parent effectively severs them from the
  // view graph.
  //
  // For example, imagine the following view graph:
  //
  //    A
  //   / \
  //  B  C
  //    / \
  //   D  E
  //
  // If we are cleaning up the node for view C, we need to remove that view
  // from A's child views. However, we do not need to remove D and E from C's
  // child views, since removing C transitively removes D and E as well.
  //
  // To accomplish this, we track the nearest view to this render node on the
  // owner view, the root-most view in the graph (A in the example above). If
  // we detect a view that is a direct child of that view, we remove it from
  // the `childViews` array. Other parent/child view relationships are
  // untouched.  This view is then cleared once cleanup is complete in
  // `didCleanupTree`.
  view.ownerView._destroyingSubtreeForView = view;
}
