// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class

  Displays a progress bar.  You can display both a defined and an
  indeterminate progressbar.  The progress bar itself is designed to be styled
  using CSS classes with the following structure:

      <div class="sc-progress-view"><div class="inner"></div></div>

  The outer can form the boundary of the bar while the inner will be adjusted
  to fit the percentage of the progress.

  Creating a ProgressView accepts a number of properties, for example:

      progressView: SC.ProgressView.design({
        value: 50,
        minimum: 0,
        maximum: 100,
        isIndeterminate: NO,
        isEnabled: YES
      })

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.ProgressView = SC.View.extend(SC.Control,
/** @scope SC.ProgressView.prototype */{

  /**
    @type Array
    @default ['sc-progress-view']
    @see SC.View#classNames
  */
  classNames: ['sc-progress-view'],

  /**
    @type Array
    @default ['displayValue', 'ariaValue', 'minimum', 'maximum', 'isIndeterminate', 'isRunning', 'isVisibleInWindow']
    @see SC.View#displayProperties
  */
  displayProperties: ['displayValue', 'ariaValue', 'minimum', 'maximum', 'isIndeterminate', 'isRunning', 'isVisibleInWindow'],

  /**
    @type String
    @default 'progressRenderDelegate'
  */
  renderDelegateName: 'progressRenderDelegate',

  // ........................................
  // PROPERTIES
  //

  /**
    Bind this to the current value of the progress bar.  Note that by default
    an empty value will disable the progress bar and a multiple value will make
    it indeterminate.

    @type Number
    @default 0.50
  */
  value: 0.50,

  /** @private */
  valueBindingDefault: SC.Binding.single().notEmpty(),

  /**
    @field
    @type Number
    @observes value
    @observes maximum
    @observes minimum
  */
  displayValue: function(){
    var minimum = this.get('minimum') || 0.0,
        maximum = this.get('maximum') || 1.0,
        value = this.get('value') || 0.0;

    // Percent value.
    value = (value - minimum) / (maximum - minimum);

    if (isNaN(value)) value = 0.0;
    // cannot be smaller then minimum
    if (value < 0.0) value = 0.0;
    // cannot be larger then maximum
    if (value > 1.0) value = 1.0;

    return value;
  }.property('value', 'maximum', 'minimum').cacheable(),

  /**
    The WAI-ARIA role for progress view.

    @type String
    @default 'progressbar'
    @readOnly
  */
  ariaRole: 'progressbar',

  /**
    The WAI-ARIA value for the progress view. This value will be passed to any
    rendering code as-is, not converted into percentages, etc. It is computed
    based on the original value property.

    @property
  */
  ariaValue: function() {
    return this.get('value');
  }.property('value').cacheable(),

  /**
    The minimum value of the progress.

    @type Number
    @default 0
  */
  minimum: 0,

  /** @private */
  minimumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the minimum progress value
    from the content object.  If this is set to null then the minimum value
    will not be derived from the content object.

    @type String
    @default null
  */
  contentMinimumKey: null,

  /**
    The maximum value of the progress bar.

    @type Number
    @default 1.0
  */
  maximum: 1.0,

  /** @private */
  maximumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the maximum progress value
    from the content object.  If this is set to null then the maximum value
    will not be derived from the content object.

    @type String
    @default null
  */
  contentMaximumKey: null,

  /**
    Set to true if the item in progress is indeterminate.  This may be
    overridden by the actual value.

    @type Boolean
    @default NO
  */
  isIndeterminate: NO,

  /** @private */
  isIndeterminateBindingDefault: SC.Binding.bool(),

  /**
    Set to YES when the process is currently running.  This will cause the
    progress bar to animate, especially if it is indeterminate.

    @type Boolean
    @default NO
  */
  isRunning: NO,

  /** @private */
  isRunningBindingDefault: SC.Binding.bool(),

  /**
    Optionally specify the key used to extract the isIndeterminate value
    from the content object.  If this is set to null then the isIndeterminate
    value will not be derived from the content object.

    @type String
    @default null
  */
  contentIsIndeterminateKey: null,

  // ........................................
  // INTERNAL SUPPORT
  //

  /** @private */
  contentPropertyDidChange: function(target, key) {
    var content = this.get('content');
    this.beginPropertyChanges()
      .updatePropertyFromContent('value', key, 'contentValueKey', content)
      .updatePropertyFromContent('minimum', key, 'contentMinimumKey', content)
      .updatePropertyFromContent('maximum', key, 'contentMaximumKey', content)
      .updatePropertyFromContent('isIndeterminate', key, 'contentIsIndeterminateKey', content)
    .endPropertyChanges();
  },

  /** @private */
  didCreateLayer: function() {
    // When using the JavaScript animation, we cannot start until the layer is
    // created.  Then if we are indeterminate, running and visible in the
    // window already, start animating.
    if (this.get('isIndeterminate') && this.get('isRunning') && this.get('isVisibleInWindow')) {
      this.displayDidChange();
    }
  }

});

