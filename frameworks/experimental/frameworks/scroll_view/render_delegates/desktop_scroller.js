// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BaseTheme.desktopScrollerRenderDelegate = SC.RenderDelegate.create({
  className: 'desktop-scroller',

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
      ('<div class="thumb" style="%@:' + dataSource.get('thumbLength') + 'px;' +
                                'top:' + dataSource.get('thumbPosition') + 'px;">').
        fmt(isVertical ? 'height' : 'width'),
         '<div class="thumb-center"></div>',
         '<div class="thumb-top"></div>',
         '<div class="thumb-bottom"></div>',
      '</div>');


    context.setAttr('aria-orientation',
                 (layoutDirection === SC.LAYOUT_VERTICAL) ? 'vertical' : 'horizontal');
    context.setAttr('aria-valuemax', dataSource.get('maximum'));
    context.setAttr('aria-valuemin', dataSource.get('minimum'));
    context.setAttr('aria-valuenow', dataSource.get('value'));
    context.setAttr('aria-controls', dataSource.get('controlsId'));
  },

  update: function (dataSource, jquery) {
    var layoutDirection = dataSource.get('layoutDirection'),
        isVertical = layoutDirection === SC.LAYOUT_VERTICAL,
        isHorizontal = layoutDirection === SC.LAYOUT_HORIZONTAL,
        controlsAreHidden = dataSource.get('controlsHidden'),
        thumb, K = 'desktopScrollerRenderDelegate';

    jquery.setClass({
      'sc-vertical': isVertical,
      'sc-horizontal': isHorizontal,
      disabled: !dataSource.get('isEnabled'),
      'controls-hidden': controlsAreHidden
    });

    if (dataSource.didChangeFor(K, 'maximum')) {
      jquery.attr('aria-valuemax', dataSource.get('maximum'));
    }

    if (dataSource.didChangeFor(K, 'minimum')) {
      jquery.attr('aria-valuemin', dataSource.get('minimum'));
    }

    if (dataSource.didChangeFor(K, 'value')) {
      jquery.attr('aria-valuenow', dataSource.get('value'));
    }

    if (dataSource.didChangeFor(K, 'controlsId')) {
      jquery.attr('aria-controls', dataSource.get('controlsId'));
    }

    // Don't bother if the controls are hidden.
    if (!controlsAreHidden) {
      thumb = jquery.find('.thumb');

      if (dataSource.didChangeFor(K, 'thumbPosition')) {
        thumb.css(layoutDirection === SC.LAYOUT_VERTICAL ?
                  'top' : 'left', dataSource.get('thumbPosition'));
      }

      if (dataSource.didChangeFor(K, 'thumbLength')) {
        thumb.css(layoutDirection === SC.LAYOUT_VERTICAL ?
                  'height' : 'width', dataSource.get('thumbLength'));
      }
    }
  }
});
