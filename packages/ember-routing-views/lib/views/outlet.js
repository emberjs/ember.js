/**
@module ember
@submodule ember-routing-views
*/

import ContainerView from "ember-views/views/container_view";
import { _Metamorph } from "ember-views/views/metamorph_view";
import { get } from "ember-metal/property_get";

export var CoreOutletView = ContainerView.extend({
  init: function() {
    this._super();
    this._childOutlets = Ember.A();
    this._outletState = null;
  },

  _isOutlet: true,

  _parentOutlet: function() {
    var parent = this._parentView;
    while (parent && !parent._isOutlet) {
      parent = parent._parentView;
    }
    return parent;
  },

  _linkParent: Ember.on('init', 'parentViewDidChange', function() {
    var parent = this._parentOutlet();
    if (parent) {
      parent._childOutlets.push(this);
      if (parent._outletState) {
        this.setOutletState(parent._outletState.outlets[this._outletName]);
      }
    }
  }),

  willDestroy: function() {
    var parent = this._parentOutlet();
    if (parent) {
      parent._childOutlets.removeObject(this);
    }
    this._super();
  },


  _diffState: function(state) {
    while (state && emptyRouteState(state)) {
      state = state.outlets.main;
    }
    var different = !sameRouteState(this._outletState, state);
    this._outletState = state;
    return different;
  },

  setOutletState: function(state) {
    if (!this._diffState(state)) {
      var children = this._childOutlets;
      for (var i = 0 ; i < children.length; i++) {
        var child = children[i];
        child.setOutletState(this._outletState && this._outletState.outlets[child._outletName]);
      }
    } else {
      var view = this._buildView(this._outletState);
      var length = get(this, 'length');
      if (view) {
        this.replace(0, length, [view]);
      } else {
        this.replace(0, length , []);
      }
    }
  },

  _buildView: function(state) {
    if (!state) { return; }

    var LOG_VIEW_LOOKUPS = get(this, 'namespace.LOG_VIEW_LOOKUPS');
    var view;
    var render = state.render;
    var ViewClass = render.ViewClass;
    var isDefaultView = false;

    if (!ViewClass) {
      isDefaultView = true;
      ViewClass = this.container.lookupFactory(this._isTopLevel ? 'view:toplevel' : 'view:default');
    }

    view = ViewClass.create({
      _debugTemplateName: render.name,
      renderedName: render.name,
      controller: render.controller
    });

    if (!get(view, 'template')) {
      view.set('template', render.template);
    }

    if (LOG_VIEW_LOOKUPS) {
      Ember.Logger.info("Rendering " + render.name + " with " + (render.isDefaultView ? "default view " : "") + view, { fullName: 'view:' + render.name });
    }

    return view;
  }
});

function emptyRouteState(state) {
  return !state.render.ViewClass && !state.render.template;
}

function sameRouteState(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  a = a.render;
  b = b.render;
  for (var key in a) {
    if (a.hasOwnProperty(key)) {
      // name is only here for logging & debugging. If two different
      // names result in otherwise identical states, they're still
      // identical.
      if (a[key] !== b[key] && key !== 'name') {
        return false;
      }
    }
  }
  return true;
}

export var OutletView = CoreOutletView.extend(_Metamorph);
