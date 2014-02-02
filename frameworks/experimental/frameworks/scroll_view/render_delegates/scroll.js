// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.scrollRenderDelegate = SC.RenderDelegate.create({
  className: 'scroll',

  render: function (dataSource, context) {
    context.push('<div class="corner"></div>');
  },

  update: function (dataSource, context) {
    var K = 'scrollRenderDelegate',
        thicknessDidChange = dataSource.didChangeFor(K, 'nativeScrollbarThickness'),
        scroll = context.find('> .sc-scroll-container-view'),
        canScroll, thickness = dataSource.get('nativeScrollbarThickness');

    if (thicknessDidChange || dataSource.didChangeFor(K, 'canScrollHorizontal')) {
      canScroll = dataSource.get('canScrollHorizontal');
      scroll.css('margin-bottom', canScroll ? -1 * thickness : 0);
      scroll.css('overflow-x', canScroll ? 'scroll' : 'hidden');
    }

    if (thicknessDidChange || dataSource.didChangeFor(K, 'canScrollVertical')) {
      canScroll = dataSource.get('canScrollVertical');
      scroll.css('margin-right', canScroll ? -1 * thickness : 0);
      scroll.css('overflow-y', canScroll ? 'scroll' : 'hidden');
    }
  }

});
