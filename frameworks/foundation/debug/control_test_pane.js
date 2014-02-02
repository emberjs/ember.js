// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global test Q$ */

// TODO: IMPROVE CODE QUALITY.  This code was put together quickly in order to
// test the SproutCore framework.  It does not match up to the project's
// normal documentation, design and coding standards.  Do not rely on this
// code as an example of how to build your own applications.

/** @class
  Generates a pane that will display vertically stacked views for testing.
  You can use this class in test mode to easily create a palette with views
  configured in different ways.

  # Example

      var pane = SC.ControlTestPane.design()
        .add('basic', SC.CheckboxView.design({ title: "Hello World" }))
        .add('disabled', SC.CheckboxView.design({
          title: "Hello World", isEnabled: NO
        }));

      module("CheckboxView UI", pane);

      test("basic", function() {
        var view = pane.view('basic');
        ok(view.get('isEnabled'), 'should be enabled');
      });

  @extends SC.Pane
  @since SproutCore 1.0
*/
SC.ControlTestPane = SC.Pane.extend(
/** @scope SC.ControlTestPane.prototype */ {

  classNames: ['sc-control-test-pane'],
  layout: { right: 20, width: 350, top: 65, bottom: 5 },

  /**
    The starting top location for the first row.  This will increment as
    views are added to the pane.

    @type Number
    @default 0
  */
  top: 0,

  /**
    The default height of each row.  This will be used for a view unless you
    manually specify a height in the view's layout.

    @type Number
    @default 20
  */
  height: 20,

  /**
    The default padding added to the edges and between each row.

    @type Number
    @default 4
  */
  padding: 4,

  /**
    Retrieves the test sample view that was added with the passed key name.

    @param {String} keyName the key used to register the view.
    @returns {SC.View} view instance
  */
  view: function(keyName) {
    var idx = this._views[keyName];
    if (!idx) throw new Error("SC.ControlTestPane does not have a view named %@".fmt(keyName));
    return this.childViews[idx].childViews[0];
  },

  /** @private */
  init: function() {
    sc_super();
    if (!this._views) this._views = {};
    this.append(); // auto-add to screen

    // Also adjust unit test results to make space
    // use setTimeout to avoid screwing with the RunLoop which we might be
    // testing.
    var l = this.get('layout'), w = l.right + l.width;
    setTimeout(function() {
      if (!Q$) return ; // nothing to do
      Q$('.core-test > .detail').css('marginRight', w);
    }, 100);
  }
});

/**
  Adds a test view to the control pane design.  The passed label will be used
  as the key which you can use to find the view layer.  You can either pass
  a view that is already designed or pass an array of attributes that will be
  used to create a design on the view.

  @param {String} label the view key name
  @param {SC.View} view a view class or view design
  @param {Hash} attrs optional attrs to use when designing the view
  @returns {SC.ControlTestPane} receiver
*/
SC.ControlTestPane.add = function(label, view, attrs) {
  if (attrs === undefined) attrs = {};
  if (!view.isDesign) view = view.design(attrs);

  // compute layout.
  var padding = this.prototype.padding, height = this.prototype.height;
  var top = this.prototype.top + padding*2, layout;
  var labelHeight =14;
  if (top === padding*2) top = padding; // reduce padding @ top

  // if the passed in view has a layout property and the layout has an
  // explicit, numerical height, then use that instead.
  if (view.prototype.layout && (typeof view.prototype.layout.height === SC.T_NUMBER)) height = view.prototype.layout.height;

  this.prototype.top = top + height+labelHeight+(padding*2); // make room

  // calculate labelView and add it
  layout = { left: padding, width: 150, top: top, height: 20 };
  var labelView = SC.LabelView.design({
    value: label + ':',
    layout: { left: 0, right: 0, top: 0, height: labelHeight },
   // TODO: textAlign: SC.ALIGN_RIGHT,
    // TODO: fontWeight: SC.BOLD_WEIGHT
  });

  // wrap label in parent view in order to center text vertically
  labelView = SC.View.design().layout(layout).childView(labelView);
  this.childView(labelView);

  // now layout view itself...
  var wrapper = SC.View.design({
    classNames: ['wrapper'],
    layout: { left: padding, top: top+labelHeight+padding, right: padding, height: height },
    childViews: [view]
  });
  var idx = this.prototype.childViews.length ;
  this.childView(wrapper);

  var views = this.prototype._views;
  if (!views) views = this.prototype._views = {};
  views[label] = idx ;

  return this;
};

/**
  Returns a standard setup/teardown object for use by the module() method.
*/
SC.ControlTestPane.standardSetup = function() {
  var pane = this ;
  return {
    setup: function() {
      SC.RunLoop.begin();
      pane._pane = pane.create();
      SC.RunLoop.end();
    },

    teardown: function() {
      SC.RunLoop.begin();
      if (pane._pane) pane._pane.destroy();
      SC.RunLoop.end();

      pane._pane = null ;
    }
  } ;
};

/**
  Convenience method.  Returns the view with the given name on the current
  pane instance if there is one.

  @param {String} keyName the key used to register the view.
  @returns {SC.View} view instance
*/
SC.ControlTestPane.view = function(viewKey) {
  var pane = this._pane || this._showPane ;
  if (!pane) throw new Error("view() cannot be called on a class");
  return pane.view(viewKey);
};

/**
  Registers a final test that will instantiate the control test pane and
  display it.  This allows the developer to interact with the controls once
  the test has completed.
*/
SC.ControlTestPane.show = function() {
  var pane = this ;
  test("show control test pane", function() {
    SC.RunLoop.begin();
    pane._showPane = pane.create();
    SC.RunLoop.end();
  });
};
