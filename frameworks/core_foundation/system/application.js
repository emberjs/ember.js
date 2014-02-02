// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('system/root_responder');


/** @class

  The root object for a SproutCore application. Usually you will create a
  single SC.Application instance as your root namespace. SC.Application is
  required if you intend to use SC.Responder to route events.

  ## Example

      Contacts = SC.Application.create({
        store: SC.Store.create(SC.Record.fixtures),

        // add other useful properties here
      });

  @extends SC.ResponderContext
  @since SproutCore 1.0
*/
SC.Application = SC.Responder.extend(SC.ResponderContext,
/** SC.Application.prototype */ {

  /** @private UNUSED
    The current design mode of the application and its views.

    If the application has designModes specified, this property will be set
    automatically as the window size changes across the design mode boundaries.

    @property {String}
    @default null
  */
  // designMode: null,

  /**
    A hash of the design mode thresholds for this application.

    While a "design" (the manner views are positioned, shaped and styled) may be
    flexible enough to stretch up for a large display and to compress down
    for a medium sized display, at a certain point it often makes more sense
    to stop stretching and compressing and just implement an additional new design
    specific to the much different display size. In order to make this possible
    and with as much ease as possible, SproutCore includes support for "design
    modes". Design modes are based on the current display size and orientation.

    SproutCore supports three size-based design modes by default: 's' for small,
    'm' for medium and 'l' for large. Smartphones and handheld devices like the
    iPod Touch fall within the small category, tablets and normal desktop displays
    fall within the medium category and retina desktops or 4K displays fall
    into the large category.

    When the display size crosses a threshold between one size category to
    another, SproutCore will update the design mode of each view in the
    application, giving you a chance to provide overrides for that specific
    size via the special `modeAdjust` property.

    For example, if you wanted to hide a view completely when in the small (s)
    mode you could add:

        //...

        mediumPlusView: SC.View.extend({

          // Design mode overrides.
          modeAdjust: { s: { isVisible: false } } // Hide the view in 's' or 'small' mode.

        }),

        //...

    As you can see, we simply indicate the property overrides that we want
    for the specific mode. To adjust the height for medium mode, you could add:

        //...

        myView: SC.View.extend({

          // The normal layout always applies.
          layout: { height: 24 },

          // Design mode overrides.
          modeAdjust: { m: { layout: { height: 30 } } // Adjust the height in 'm' or 'medium' mode.

        }),

        //...

    Note that the values in `modeAdjust` are overrides for that mode and the
    values will be *reset* to their original values when leaving that mode.

    The second component to design modes is orientation. Each of the size
    categories can have two different orientations: 'l' for landscape or 'p' for
    portrait. Therefore, you may want to alter the design to account for the
    device orientation as well using `modeAdjust`. To do this, you simply
    specify orientation specific designs with the `_l` or `_p` suffix
    accordingly.

    For example, you can provide a configuration for a size category with
    slight deviations for orientations of that size all in just a few lines
    of code,

        //...

        customView: SC.View.extend({

          // The default alignment for this custom view's contents.
          alignment: SC.ALIGN_LEFT,

          // The default line height for this custom view's contents.
          lineHeight: 40,

          // Design mode overrides.
          modeAdjust: {
            m: { lineHeight: 50 }, // Overrides for medium mode regardless of orientation.
            m_p: { alignment: SC.ALIGN_CENTER }, // Overrides for medium - portrait mode.
            m_l: { layout: { top: 20 } } // Overrides for medium - landscape mode.
          }

        }),

        //...

    ### A note on styling for design modes

    Class names are automatically applied to each view depending on the mode
    as found in the SC.DESIGN_MODE_CLASS_NAMES hash. By default, your
    views will have one of three class names added:

        > 'sc-small' in small mode
        > 'sc-medium' in medium mode
        > 'sc-large' in large mode

    As well, the `body` element is given an orientation class name that you
    can use as well:

        > 'sc-landscape' in landscape orientation
        > 'sc-portrait' in portrait orientation

    ### A note on overriding layouts

    Layout overrides work slightly differently than regular property overrides,
    because they are set via `adjust`. This means they apply on *top* of the
    default layout, they don't replace the default layout. For example,
    the default layout is `{ left: 0, right: 0, top: 0, bottom: 0 }` and if
    we provide a design mode like,

        modeAdjust: { l: { layout: { top: 50 } } }

    The layout becomes `{ left: 0, right: 0, top: 50, bottom: 0 }`. If we had
    a default layout like `{ centerX: 0, centerY: 0, height: 100, width: 100 }`
    and we wanted to change it to a left positioned layout, we would need to
    null out the centerX value like so,

        modeAdjust: { l: { layout: { centerX: null, left: 0 } } } // Convert to left positioned layout.

    ### A note on the medium category

    The medium category covers tablets *and* non-retina desktops and laptops.
    While we could try to further differentiate between these two categories,
    there is no safe way to do this and to do so would cause more harm than good.
    Tablets can be connected to mice and keyboards, desktops can have touch
    screens and there is no way to know whether a mouse, touch or pointer is
    going to be used from one event to the next. Therefore the message should
    be clear, *you should always design for touch*. This means that a medium
    sized design should be expected to work well on a laptop and a tablet.

    ### A note on customizing the design mode categories

    Design mode thresholds are determined by the area of the display divided by
    the device pixel ratio. In this manner a 1024 x 768 display on a
    handheld device can be differentiated from a 1024 x 768 display on a
    desktop. Through testing and research, the three categories of 'small',
    'medium' and 'large' were chosen with thresholds between them of
    500,000 sq.px and 2,000,000 sq.px.

    Therefore, any display area divided by device pixel ratio that is less
    than 500,000 will be considered 'small' and likewise a calculated area
    of over 2,000,000 will be considered 'large'. This should be sufficient
    for almost all device specific designs and as is mentioned earlier,
    trying to get even more fine-grained is a dangerous endeavor. However,
    you can set your own thresholds easily enough by overriding this property.

    @readonly
    @property {Object}
    @default { s: 500000, m: 2000000, l: Infinity }
  */
  designModes: {
    's': 500000, // ex. smart phone display
    'm': 2000000, // ex. tablet & non-retina desktop display
    'l': Infinity // ex. retina desktop display and TV
  },

  /** @private */
  init: function () {
    sc_super();

    // Initialize the value on the RootResponder when it is ready.
    SC.ready(this, '_setDesignModes');
  },

  /** @private */
  _setDesignModes: function () {
    var designModes = this.get('designModes'),
      responder = SC.RootResponder.responder;

    if (designModes) {
      // All we do is pass the value to the root responder for convenience.
      responder.set('designModes', designModes);
      // UNUSED.
      // this.bind('designMode', SC.Binding.from('SC.RootResponder.responder.currentDesignMode'));
    }
  }

});
