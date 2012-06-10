// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-views/views/states/default");
require("ember-views/views/states/pre_render");
require("ember-views/views/states/in_buffer");
require("ember-views/views/states/in_dom");
require("ember-views/views/states/destroyed");

var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

/** @private */
Ember.View.RenderStateManager = Ember.StateManager.extend({
  initialState: '_default.preRender',

  states: {
    '_default': Ember.View.states.DefaultState.create({
      preRender: Ember.View.states.PreRenderState.create(),
      hasElement: Ember.View.states.HasElementState.create({
        inDOM: Ember.View.states.InDomState.create()
      }),
      inBuffer: Ember.View.states.InBufferState.create(),
      destroyed: Ember.View.states.DestroyedState.create()
    })
  }
});
