// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require("theme");
SC.LegacyTheme.PROGRESS_ANIMATED_BACKGROUND_MATRIX = [];
SC.LegacyTheme.PROGRESS_OFFSET_RANGE = 24;

/**
  @class
  Renders and updates DOM representations of progress bars.

  Parameters
  --------------------------
  Expects these properties on the data source:

  - isIndeterminate
  - isRunning
  - isEnabled
  - value (from 0 to 1)

  There are a few other properties supported for backwards-compatibility
  with certain ProgressView implementations; these ProgressViews should
  be updated to match the new API. These properties will trigger deprecation
  warnings.

  Theme Constants
  -------------------------------------
  Note that, unlike render delegate parameters, which are mostly standardized,
  the theme constants can vary by the theme and the theme's method of rendering
  the control.

  - PROGRESS_ANIMATED_BACKGROUND_MATRIX: Set to the matrix used for
    background image position for animation.
    [1st image y-location, offset, total number of images]

  - PROGRESS_OFFSET_RANGE: The value of the progress inner offset range.
    Should be the same as width of image. Default it to 24.

*/
SC.LegacyTheme.progressRenderDelegate = SC.RenderDelegate.create({
  className: 'progress',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var theme    = dataSource.get('theme'),
        valueMax = dataSource.get('maximum'),
        valueMin = dataSource.get('minimum'),
        valueNow = dataSource.get('ariaValue');

    var inner, animatedBackground, value = dataSource.get('value') * 100,
        cssString, backPosition,
        isIndeterminate = dataSource.get('isIndeterminate'),
        isRunning = dataSource.get('isRunning'),
        isEnabled = dataSource.get('isEnabled'),
        offsetRange = theme.PROGRESS_OFFSET_RANGE,
        offset = (isIndeterminate && isRunning) ?
                (Math.floor(Date.now()/75)%offsetRange-offsetRange) : 0;

    //addressing accessibility
    context.setAttr('aria-valuemax', valueMax);
    context.setAttr('aria-valuemin', valueMin);
    context.setAttr('aria-valuenow', valueNow);
    context.setAttr('aria-valuetext', valueNow);

    // offsetRange from dataSource only supported for backwards-compatibility
    if (dataSource.get('offsetRange')) {
      if (!this._hasGivenOffsetRangeDeprecationWarning) {
        console.warn(
          "The 'offsetRange' property for progressRenderDelegate is deprecated. " +
          "Please override the value on your theme, instead, by setting " +
          "its PROGRESS_OFFSET_RANGE property."
        );
      }
      this._hasGivenOffsetRangeDeprecationWarning = YES;

      offsetRange = dataSource.get('offsetRange');
    }

    var classNames = {
      'sc-indeterminate': isIndeterminate,
      'sc-empty': (value <= 0),
      'sc-complete': (value >= 100)
    };

    // compute value for setting the width of the inner progress
    if (!isEnabled) {
      value = "0%" ;
    } else if (isIndeterminate) {
      value = "120%";
    } else {
      value = value + "%";
    }

    var classString = this._createClassNameString(classNames);
    context.push('<div class="sc-inner ', classString, '" style="width: ',
                  value, ';left: ', offset, 'px;">',
                  '<div class="sc-inner-head">','</div>',
                  '<div class="sc-inner-tail"></div></div>',
                  '<div class="sc-outer-head"></div>',
                  '<div class="sc-outer-tail"></div>');
  },

  update: function(dataSource, $) {
    this.updateSizeClassName(dataSource, $);

    var theme    = dataSource.get('theme'),
        valueMax = dataSource.get('maximum'),
        valueMin = dataSource.get('minimum'),
        valueNow = dataSource.get('ariaValue');

    // make accessible
    $.attr('aria-valuemax', valueMax);
    $.attr('aria-valuemin', valueMin);
    $.attr('aria-valuenow', valueNow);
    $.attr('aria-valuetext', valueNow);

    var inner, value, cssString, backPosition,
        animatedBackground = theme.PROGRESS_ANIMATED_BACKGROUND_MATRIX,
        isIndeterminate = dataSource.get('isIndeterminate'),
        isRunning = dataSource.get('isRunning'),
        isEnabled = dataSource.get('isEnabled'),
        offsetRange = dataSource.get('offsetRange'),
        offset = (isIndeterminate && isRunning) ?
                (Math.floor(Date.now()/75)%offsetRange-offsetRange) : 0;

    // compute value for setting the width of the inner progress
    if (!isEnabled) {
      value = "0%" ;
    } else if (isIndeterminate) {
      value = "120%";
    } else {
      value = (dataSource.get('value') * 100) + "%";
    }

    var classNames = {
      'sc-indeterminate': isIndeterminate,
      'sc-empty': (value <= 0),
      'sc-complete': (value >= 100)
    };

    $.setClass(classNames);
    inner = $.find('.sc-inner');

    // animatedBackground from dataSource only supported for backwards-compatibility
    if (dataSource.get('animatedBackgroundMatrix')) {
      if (!this._hasGivenAnimatedBackgroundDeprecationWarning) {
        console.warn(
          "The 'animatedBackgroundMatrix' property for progressRenderDelegate " +
          "is deprecated. Please override the value on your theme by setting " +
          "its PROGRESS_ANIMATED_BACKGROUND_MATRIX property."
        );
      }

      this._hasGivenAnimatedBackgroundDeprecationWarning = YES;

      animatedBackground = dataSource.get('animatedBackgroundMatrix');
    }

    if (!animatedBackground) {
      animatedBackground = theme.PROGRESS_ANIMATED_BACKGROUND_MATRIX;
    }

    cssString = "width: "+value+"; ";
    cssString = cssString + "left: "+offset+"px; ";
    if (animatedBackground.length === 3 ) {
      inner.css('backgroundPosition', '0px -'+
              (animatedBackground[0] +
              animatedBackground[1]*this._currentBackground)+'px');
      if(this._currentBackground===animatedBackground[2]-1
         || this._currentBackground===0){
        this._nextBackground *= -1;
      }
      this._currentBackground += this._nextBackground;

      cssString = cssString + "backgroundPosition: "+backPosition+"px; ";
      //Instead of using css() set attr for faster perf.
      inner.attr('style', cssString);
    }else{
      inner.attr('style', cssString);
    }
  },


  _createClassNameString: function(classNames) {
    var classNameArray = [], key;
    for(key in classNames) {
      if(!classNames.hasOwnProperty(key)) continue;
      if(classNames[key]) classNameArray.push(key);
    }
    return classNameArray.join(" ");
  }
});
