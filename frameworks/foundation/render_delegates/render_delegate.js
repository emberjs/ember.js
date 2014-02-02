// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  Base class for all render delegates.

  You should use SC.RenderDelegate or a subclass of it as the base for all 
  of your render delegates. SC.RenderDelegate offers many helper methods 
  and can be simpler to subclass between themes than `SC.Object`.

  Creating & Subclassing
  ===
  You create render delegates just like you create SC.Objects:

      MyTheme.someRenderDelegate = SC.RenderDelegate.create({ ... });

  You can subclass a render delegate and use that:

      MyTheme.RenderDelegate = SC.RenderDelegate.extend({ ... });
      MyTheme.someRenderDelegate = MyTheme.RenderDelegate.create({});

  And you can even subclass instances or SC.RenderDelegate:

      MyTheme.someRenderDelegate = SC.RenderDelegate.create({ ... });
      MyTheme.otherRenderDelegate = MyTheme.someRenderDelegate.create({ ... });

      // this allows you to subclass another theme's render delegate:
      MyTheme.buttonRenderDelegate = SC.BaseTheme.buttonRenderDelegate.create({ ... });

  For render delegates, subclassing and instantiating are the same.

  NOTE: Even though `.extend` and `.create` technically do the same thing, 
  convention dictates that you use `.extend` for RenderDelegates that 
  will be used primarily as base classes, and `create` for RenderDelegates
  that you expect to be instances.

  Rendering and Updating
  ===
  Render delegates are most commonly used for two things: rendering and updating
  DOM representations of controls.

  Render delegates use their `render` and `update` methods to do this:

      render: function(dataSource, context) {
        // rendering tasks here
        // example:
        context.begin('div').addClass('title')
          .text(dataSource.get('title')
        .end();
      },

      update: function(dataSource, jquery) {
        // updating tasks here
        // example:
        jquery.find('.title').text(dataSource.get('title'));
      }

  Variables
  ===
  The data source provides your render delegate with all of the information
  needed to render. However, the render delegate's consumer--usually a view--
  may need to get information back.

  For example, `SC.AutoResize` resizes controls to fit their text. You can use
  it to size a button to fit its title. But it can't just make the button
  have the same width as its title: it needs to be a little larger to make room
  for the padding to the left and right sides of the title.

  This padding will vary from theme to theme.
  
  You can specify properties on the render delegate like any other property:

      MyRenderDelegate = SC.RenderDelegate.create({
        autoSizePadding: 10
        ...
      });

  But there are multiple sizes of buttons; shouldn't the padding change as
  well? You can add hashes for the various control sizes and override properties:

      SC.RenderDelegate.create({
        autoSizePadding: 10,

        'sc-jumbo-size': {
          autoResizePadding: 20
        }

  For details, see the discussion on size helpers below.

  You can also calculate values for the data source. In this example, we calculate
  the autoSizePadding to equal half the data source's height:

      SC.RenderDelegate.create({
        autoSizePaddingFor: function(dataSource) {
          if (dataSource.get('frame')) {
            return dataSource.get('frame').height / 2;
          }
        }


  When SC.ButtonView tries to get `autoSizePadding`, the render delegate will look for
  `autoSizePaddingFor`. It will be called if it exists. Otherwise, the property will
  be looked up like normal.

  Note: To support multiple sizes, you must also render the class name; see size
  helper discussion below.

  Helpers
  ===
  SC.RenderDelegate have "helper methods" to assist the rendering process.
  There are a few built-in helpers, and you can add your own.

  Slices
  ----------------------
  Chance provides the `includeSlices` method to easily slice images for
  use in the SproutCore theme system.

      includeSlices(dataSource, context, slices);

  You can call this to add DOM that matches Chance's `@include slices()`
  directive. For example:

      MyTheme.buttonRenderDelegate = SC.RenderDelegate.create({
        className: 'button',
        render: function(dataSource, context) {
          this.includeSlices(dataSource, context, SC.THREE_SLICE);
        }
      });

  DOM elements will be added as necessary for the slices. From your CSS, you
  can match it like this:

      $theme.button {
        @include slices('button.png', $left: 3, $right: 3);
      }

  See the Chance documentation at http://guides.sproutcore.com/chance.html
  for more about Chance's `@include slices` directive.

  Sizing Helpers
  -------------------------
  As discussed previously, you can create hashes of properties for each size. 
  However, to support sizing, you must render the size's class name.

  Use the `addSizeClassName` and `updateSizeClassName` methods:

      SC.RenderDelegate.create({
        render: function(dataSource, context) {
          // if you want to include a class name for the control size
          // so you can style it via CSS, include this line:
          this.addSizeClassName(dataSource, context);

          ...
        },

        update: function(dataSource, jquery) {
          // and don't forget to use its companion in update as well:
          this.updateSizeClassName(dataSource, jquery);

          ...
        }
      });

  Controls that allow multiple sizes should also be able to automatically choose
  the correct size based on the `layout` property supplied by the user. To support
  this, you can add properties to your size hashes:

      'sc-regular-size': {
        // to match _only_ 24px-high buttons
        height: 24,

        // or, alternatively, to match ones from 22-26:
        minHeight: 20, maxHeight: 26,

        // you can do the same for width if you wanted
        width: 100
      }

  The correct size will be calculated automatically when `addSlizeClassName` is
  called. If the view explicitly supplies a control size, that size will be used;
  otherwise, it will be calculated automatically based on the properties in your
  size hash.

  Adding Custom Helpers
  ---------------------
  You can mix your own helpers into this base class by calling 
  SC.RenderDelegate.mixin; they will be available to all render delegates:

      SC.RenderDelegate.mixin({
        myHelperMethod: function(dataSource) { ... }
      });


  You can then use the helpers from your render delegates:

      MyTheme.someRenderDelegate = SC.RenderDelegate.create({
        className: 'some-thingy',
        render: function(dataSource, context) {
          this.myHelperMethod(dataSource);
        }
      });


  By convention, all render delegate methods should take a `dataSource` as 
  their first argument. If they do any rendering or updating, their second
  argument should be the `SC.RenderContext` or `jQuery` object to use.

  In addition, helpers like these are only meant for methods that should
  be made available to _all_ render delegates. If your method is specific
  to just one, add it directly; if it is specific to just a few in your
  own theme, consider just using mixins or subclassing SC.RenderDelegate:

      // If you use it in a couple of render delegates, perhaps a mixin
      // would be best:
      MyTheme.MyRenderHelper = {
        helper: function(dataSource) {
          ...
        }
      };

      MyTheme.myRenderDelegate = SC.RenderDelegate.create(MyTheme.MyRenderHelper, {
        render: function(dataSource, context) { ... }
      });


      // If you use it in all render delegates in your theme, perhaps it
      // would be better to create an entire subclass of
      // SC.RenderDelegate:
      MyTheme.RenderDelegate = SC.RenderDelegate.extend({
        helper: function(dataSource) {
          ...
        }
      });

      MyTheme.myRenderDelegate = MyTheme.RenderDelegate.create({
        render: function(dataSource, context) { ... }
      });

  Data Sources
  ===
  Render delegates get the content to be rendered from their data sources.

  A data source can be any object, so long as the object implements
  the following methods:

  - `get(propertyName)`: Returns a value for a given property.
  - `didChangeFor(context, propertyName)`: Returns YES if any properties
    listed have changed since the last time `didChangeFor` was called with
    the same context.

  And the following properties (to be accessed through `.get`):

  - `theme`: The theme being used to render.
  - `renderState`: An empty hash for the render delegate to save state in.
    While render delegates are _usually_ completely stateless, there are
    cases where they may need to save some sort of state.
*/
SC.RenderDelegate = /** @scope SC.RenderDelegate.prototype */{
  
  // docs will look more natural if these are all considered instance
  // methods/properties.

  /**
    Creates a new render delegate based on this one. When you want to
    create a render delegate, you call this:
   
        MyTheme.myRenderDelegate = SC.RenderDelegate.create({
          className: 'my-render-delegate',
          render: function(dataSource, context) {
            // your code here...
          }
        })
  */
  create: function() {
    var ret = SC.beget(this);

    var idx, len = arguments.length;
    for (idx = 0; idx < len; idx++) {
      ret.mixin(arguments[idx]);
    }

    return ret;
  },

  /**
    Adds extra capabilities to this render delegate.
   
    You can use this to add helpers to all render delegates:
   
        SC.RenderDelegate.reopen({
          myHelperMethod: function(dataSource) { ... }
        });
   
  */
  reopen: function(mixin) {
    var i, v;
    for (i in mixin) {
      v = mixin[i];
      if (!mixin.hasOwnProperty(i)) {
        continue;
      }

      if (typeof v === 'function' && v !== this[i]) {
        v.base = this[i] || SC.K;
      }

      if (v && v.isEnhancement && v !== this[i]) {
        v = SC._enhance(this[i] || SC.K, v);
      }

      this[i] = v;
    }
  },

  /**
    Returns the specified property from this render delegate.
    Implemented to match SC.Object's API.
  */
  get: function(propertyName) { return this[propertyName]; },

  /**
    Gets or generates the named property for the specified
    dataSource. If a method `propertyName + 'For'` is found,
    it will be used to compute the value, `dataSource`
    being passed as an argument. Otherwise, it will simply
    be looked up on the render delegate.
    
    NOTE: this implementation is a reference implementation. It
    is overridden in the sizing code (helpers/sizing.js) to be
    size-sensitive.
  */
  getPropertyFor: function(dataSource, propertyName) {
    if (this[propertyName + 'For']) {
      return this[propertyName + 'For'](dataSource, propertyName);
    }

    return this[propertyName];
  },

  /**
    All render delegates should have a class name. Any time a render delegate is
    used, this name should be added as a class name (`SC.View`s do this
    automatically).
  */
  className: undefined,

  /**
    Writes the DOM representation of this render delegate to the
    supplied `SC.RenderContext`, using the supplied `dataSource`
    for any data needed.
    
    @method
    @param {DataSource} dataSource An object from which to get
    data. See documentation on data sources above.
    @param {SC.RenderContext} context A context to render DOM into.
  */
  render: function(dataSource, context) {

  },

  /**
    Updates the DOM representation of this render delegate using
    the supplied `jQuery` instance and `dataSource`.
    
    @method
    @param {DataSource} dataSource An object from which to get
    data. See documentation on data sources above.
    @param {jQuery} jquery A jQuery instance containing the DOM
    element to update. This will be the DOM generated by `render()`.
  */
  update: function(dataSource, jQuery) {

  }
};

// create and extend are technically identical.
SC.RenderDelegate.extend = SC.RenderDelegate.create;

// and likewise, as this is both a class and an instance, mixin makes
// sense instead of reopen...
SC.RenderDelegate.mixin = SC.RenderDelegate.reopen;
