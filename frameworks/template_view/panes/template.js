// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  SC.TemplatePane is a helper that will create a new pane based on
  a single root TemplateView.

      function main() {
        MyApp.mainPane = SC.TemplatePane.append({
          layerId: 'my-root-id',
          templateName: 'app'
        })
      }

  @extends SC.Object
  @since SproutCore 1.5
*/
SC.TemplatePane = SC.Object.extend({});

SC.TemplatePane.mixin( /** @scope SC.TemplatePane */ {

  /**
    Creates a new pane with a single TemplateView.

    @param {Object} attrs describes the pane to create
    @returns {SC.MainPane} the created pane
  */
  append: function(attrs) {
    var pane = SC.MainPane.extend({
      childViews: ['contentView'],

      contentView: SC.TemplateView.design(attrs),

      touchStart: function(touch) {
        touch.allowDefault();
      },

      touchesDragged: function(evt, touches) {
        evt.allowDefault();
      },

      touchEnd: function(touch) {
        touch.allowDefault();
      }
    });

    pane = pane.create().append();

    // Normally the awake process is started in the Page, but we don't have a Page
    pane.awake();

    return pane;
  }
});
