// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Displays a horizontal or vertical scroller.

  You will not usually need to work with scroller views directly,
  but you may override this class to implement your own custom scrollers.

  Because the scroller uses the dimensions of its constituent elements to
  calculate layout, you may need to override the default display metrics.

  You can either create a subclass of ScrollerView with the new values, or
  provide your own in your theme:

      SC.mixin(SC.ScrollerView.prototype, {
        scrollbarThickness: 14,
        capLength: 18,
        capOverlap: 14,
        buttonOverlap: 11,
        buttonLength: 41
      });

  You can change whether scroll buttons are displayed by setting the
  hasButtons property.

  @extends SC.View
  @since SproutCore 1.6
 */
SC.CoreScrollerView = SC.View.extend(
  /** @scope SC.CoreScrollerView.prototype */{

  /**
    @type Array
    @default ['sc-scroller-view']
    @see SC.View#classNames
   */
  classNames: ['sc-scroller-view'],

  /**
    @type Array
    @default ['thumbPosition', 'thumbLength', 'isEnabled', 'controlsHidden', 'capLength'
              'layoutDirection', 'hasButtons', 'value', 'controlsId', 'maximum', 'minimum']
    @see SC.View#displayProperties
   */
  displayProperties: ['thumbPosition', 'thumbLength', 'isEnabled', 'controlsHidden',
                      'layoutDirection', 'hasButtons', 'capLength',
                      'value', 'controlsId', 'maximum', 'minimum'], // WAI-ARIA attrs

  /**
    The WAI-ARIA role for scroller view.

    @type String
    @default 'scrollbar'
    @readOnly
   */
  ariaRole: 'scrollbar',

  // ..........................................................
  // PROPERTIES
  //

  /**
    If YES, a click on the track will cause the scrollbar to scroll to that position.
    Otherwise, a click on the track will cause a page down.

    In either case, alt-clicks will perform the opposite behavior.

    @type Boolean
    @default NO
   */
  shouldScrollToClick: NO,

  /**
    WAI-ARIA ID to the control that this scroller is controlling.

    @field
    @type String
   */
  controlsIdBinding: SC.Binding.oneWay('.parentView*contentView.layerId'),

  /**
    @type Number
    @observes value
    @observes touchValue
   */
  displayValue: function () {
    return this.get('value');
  }.property("value").cacheable(),

  /**
    The value of the scroller.
    The value represents the position of the scroller's thumb.

    @field
    @type Number
    @observes maximum
    @observes minimum
   */
  value: function (key, value) {
    var minimum = this.get('minimum');
    if (typeof value !== "undefined") {
      this._scs_value = value;
    }

    value = this._scs_value || minimum; // default value is at top / left
    return Math.max(Math.min(value, this.get('maximum')), minimum);
  }.property('maximum', 'minimum').cacheable(),

  /**
    The portion of the track that the thumb should fill. Usually the
    proportion will be the ratio of the size of the scroll view's content view
    to the size of the scroll view.

    Should be specified as a value between 0.0 (minimal size) and 1.0 (fills
    the slot). Note that if the proportion is 1.0 then the control will be
    disabled.

    @type Number
    @default 0.0
   */
  proportion: 0,

  /**
    The maximum offset value for the scroller.  This will be used to calculate
    the internal height/width of the scroller itself.

    When set less than the height of the scroller, the scroller is disabled.

    @type Number
    @default 100
   */
  maximum: 100,

  /**
    The minimum offset value for the scroller.  This will be used to calculate
    the internal height/width of the scroller itself.

    @type Number
    @default 0
   */
  minimum: 0,

  /**
    YES to enable scrollbar, NO to disable it. Scrollbars will automatically
    disable if the maximum scroll width does not exceed their capacity.

    @field
    @type Boolean
    @default YES
    @observes proportion
   */
  isEnabled: function (key, value) {
    var enabled;
    if (typeof value !== "undefined") {
      this._scsv_isEnabled = value;
    }
    enabled = this._scsv_isEnabled;

    return !SC.none(enabled) ? enabled : this.get('proportion') < 1;
  }.property('proportion').cacheable(),

  /** @private */
  _scsv_isEnabled: undefined,

  /**
    Determine the layout direction.  Determines whether the scrollbar should
    appear horizontal or vertical.  This must be set when the view is created.
    Changing this once the view has been created will have no effect. Possible
    values:

      - SC.LAYOUT_VERTICAL
      - SC.LAYOUT_HORIZONTAL

    @type String
    @default SC.LAYOUT_VERTICAL
   */
  layoutDirection: SC.LAYOUT_VERTICAL,

  /**
    Whether or not the scroller should display scroll buttons

    @type Boolean
    @default YES
   */
  hasButtons: YES,


  // ..........................................................
  // DISPLAY METRICS
  //

  /**
    The width (if vertical scroller) or height (if horizontal scroller) of the
    scrollbar.

    @type Number
    @default 14
   */
  scrollbarThickness: 14,

  /**
    Whether or not the scrollbar is translucent.
    This effectively means you would like the scroller to be overlaid.

    @type Boolean
    @default NO
   */
  isTranslucent: NO,

  /**
    The width or height of the cap that encloses the track.

    @type Number
    @default 18
   */
  capLength: 18,

  /**
    The amount by which the thumb overlaps the cap.

    @type Number
    @default 14
   */
  capOverlap: 14,

  /**
    The width or height of the up/down or left/right arrow buttons. If the
    scroller is not displaying arrows, this is the width or height of the end
    cap.

    @type Number
    @defaut 41
   */
  buttonLength: 41,

  /**
    The amount by which the thumb overlaps the arrow buttons. If the scroller
    is not displaying arrows, this is the amount by which the thumb overlaps
    the end cap.

    @type Number
    @default 11
   */
  buttonOverlap: 11,

  /**
    The minimium length that the thumb will be, regardless of how much content
    is in the scroll view.

    @type Number
    @default 20
   */
  minimumThumbLength: 20,

  // ..........................................................
  // SCROLLER DIMENSION COMPUTED PROPERTIES
  //

  /** @private
    Returns the total length of the track in which the thumb sits.

    The length of the track is the height or width of the scroller, less the
    cap length and the button length. This property is used to calculate the
    position of the thumb relative to the view.

    @property
   */
  trackLength: function () {
    return this.get('scrollerLength') -
      (this.get('capLength') - this.get('capOverlap')) -      // Subtract the size of the top/left cap
      (this.get('buttonLength') - this.get('buttonOverlap')); // Subtract the size of the scroll buttons,
                                                              // or the end cap if they are not shown.
  }.property('scrollerLength', 'capLength', 'capOverlap', 'buttonLength', 'buttonOverlap').cacheable(),

  /** @private
    Returns the height of the view if this is a vertical scroller or the width
    of the view if this is a horizontal scroller. This is used when scrolling
    up and down by page, as well as in various layout calculations.

    @type Number
   */
  scrollerLength: function () {
    var frame = this.get('frame'),
        layoutDirection = this.get('layoutDirection');

    return layoutDirection === SC.LAYOUT_VERTICAL ? frame.height :
           layoutDirection === SC.LAYOUT_HORIZONTAL ? frame.width : 0;
  }.property('frame').cacheable(),

  /** @private
    The total length of the thumb. The size of the thumb is the
    length of the track times the content proportion.

    @property
   */
  thumbLength: function () {
    var length = Math.floor(this.get('trackLength') * this.get('proportion'));

    return Math.max(isNaN(length) ? 0 : length, this.get('minimumThumbLength'));
  }.property('trackLength', 'proportion', 'minimumThumbLength').cacheable(),

  /** @private
    The position of the thumb in the track.

    @type Number
    @isReadOnly
   */
  thumbPosition: function () {
    var position = (this.get('displayValue') / this.get('maximum')) *
                    (this.get('trackLength') - this.get('thumbLength')) +
                    this.get('capLength') - this.get('capOverlap'); // account for the top / left cap
    return Math.floor(isNaN(position) ? 0 : position);
  }.property('displayValue', 'maximum', 'trackLength', 'thumbLength', 'capLength', 'capOverlap').cacheable(),

  /** @private
    YES if the maximum value exceeds the frame size of the scroller.  This
    will hide the thumb and buttons.

    @type Boolean
    @isReadOnly
   */
  controlsHidden: function () {
    return this.get('proportion') >= 1;
  }.property('proportion').cacheable()

});
