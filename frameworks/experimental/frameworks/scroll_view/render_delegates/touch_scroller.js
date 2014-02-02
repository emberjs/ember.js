// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.touchScrollerRenderDelegate = SC.RenderDelegate.create({
  className: 'touch-scroller',

  render: function (dataSource, context) {
    var layoutDirection = dataSource.get('layoutDirection'),
        isVertical = layoutDirection === SC.LAYOUT_VERTICAL,
        isHorizontal = layoutDirection === SC.LAYOUT_HORIZONTAL;

    context.setClass({
      'sc-vertical': isVertical,
      'sc-horizontal': isHorizontal,
      disabled: !dataSource.get('isEnabled'),
      'controls-hidden': dataSource.get('controlsHidden')
    });

    context.push(
      '<div class="track"></div>',
      '<div class="cap"></div>',
      dataSource.get('hasButtons') ?
        '<div class="button-bottom"></div><div class="button-top"></div>' :
        '<div class="endcap"></div>',
      '<div class="thumb">',
        '<div class="thumb-top"></div>',
        '<div class="thumb-clip">',
          ('<div class="thumb-inner" style="-webkit-transform: ' +
             'translate%@(' + (dataSource.get('thumbLength') - 1044) + 'px);').
               fmt(isVertical ? 'Y' : 'X') + '">',
             '<div class="thumb-center"></div>',
             '<div class="thumb-bottom"></div>',
           '</div>',
         '</div>',
      '</div>');
  },

  update: function (dataSource, context) {
    var layoutDirection = dataSource.get('layoutDirection'),
        isVertical = layoutDirection === SC.LAYOUT_VERTICAL,
        isHorizontal = layoutDirection === SC.LAYOUT_HORIZONTAL,
        controlsAreHidden = dataSource.get('controlsHidden'),
        K = 'touchScrollerRenderDelegate';

    context.setClass({
      'sc-vertical': isVertical,
      'sc-horizontal': isHorizontal,
      disabled: !dataSource.get('isEnabled'),
      'controls-hidden': controlsAreHidden
    });

    if (!controlsAreHidden) {
      var length = dataSource.get('thumbLength'),
          position = dataSource.get('thumbPosition'),
          T = 'translate3d(%@px,%@px,%@px)';

      if (dataSource.didChangeFor(K, 'thumbPosition')) {
        context.find('.thumb').css('-webkit-transform', isVertical ?
                                   T.fmt(0, position, 0) :
                                   T.fmt(position, 0, 0));
      }

      if (dataSource.didChangeFor(K, 'thumbLength')) {
        context.find('.thumb-inner').css('-webkit-transform', isVertical ?
                                         T.fmt(0, length, 0) :
                                         T.fmt(length, 0, 0));

      }
    }
  }

});
