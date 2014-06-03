function Renderer(hooks, dom) {
  this.hooks = hooks;
  this.dom = dom;
}

Renderer.prototype.render = function Renderer_render(rootView, rootMorph) {
  var views = [rootView],
      idx = 0,
      view, parentView, i, l;

  while (idx < views.length) {
    view = views[idx];

    if (view.isVirtual) {
      view.element = this.hooks.content(view);
    } else {
      view.element = this.hooks.element(view);
      this.dom.appendChild(view.element, this.hooks.content(view));
    }

    if (view._morph) {
      view._morph.update(view.element);
    } else {
      // parent is a container view and manages its child views morphs using a parent morph.
      // when parent view clears its rendering, these views will reset back to their prerender state
      view._morph = this._childViewsMorph(view._parentView).append(view.element);
    }

    view.isRendered = true;

    var childViews = view._childViews, childView;

    if (childViews) {
      for (i = 0, l = childViews.length; i < l; i++) {
        childView = childViews[i];
        childView._parentView = view;
        views.push(childView);
      }
    }

    idx++;
  }

  // only assume we are inDOM if root had morph
  if (rootMorph) {
    this.hooks.beforeInsert(views);

    rootView._morph = rootMorph;
    rootView._morph.update(view.element);

    this.hooks.afterInsert(views);
  }

  return rootView.element;
};

Renderer.prototype._renderView = function Renderer_renderView(view, isRoot) {
  if (view.isVirtual) {
    view.element = this.hooks.content(view);
  } else {
    view.element = this.hooks.element(view);
    this.dom.appendChild(view.element, this.hooks.content(view));
  }

  if (isRoot) {
    // root view append is delayed until the tree is complete
    return view.element;
  } else {
    // if view has a _morph assigned already, it was added as part of its parents rendering
    // and will be destroyed when its parent view clears its rendering

  }
};

Renderer.prototype._childViewsMorph = function Renderer_childViewsMorph(parentView) {
  if (parentView._childViewsMorph) {
    return parentView._childViewsMorph;
  }
  if (parentView.isVirtual) {
    // if virtual view is in a template
    // just manage its childViews in its assigned
    if (parentView._morph) {
      return parentView._childViewsMorph = parentView._morph;
    }
    // if root view of render is a virtual view
    // we need to create a fragment morph
    parentView._childViewsMorph = this.dom.createFragmentMorph();
    parentView.element = parentView._childViewsMorph._parent;
  }
  return parentView._childViewsMorph = this.dom.createElementMorph(parentView.element);
};

export default Renderer;
