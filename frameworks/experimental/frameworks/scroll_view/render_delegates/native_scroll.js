// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.nativeScrollRenderDelegate = SC.RenderDelegate.create({
  className: 'native-scroll',

  render: function (dataSource, context) {},

  update: function (dataSource, context) {
    var K = 'scrollRenderDelegate',
        scroll = context.find('> .sc-scroll-container-view');

    if (dataSource.didChangeFor(K, 'canScrollHorizontal')) {
      scroll.css('overflow-x', dataSource.get('canScrollHorizontal') ? 'scroll' : 'hidden');
    }

    if (dataSource.didChangeFor(K, 'canScrollVertical')) {
      scroll.css('overflow-y', dataSource.get('canScrollVertical') ? 'scroll' : 'hidden');
    }
  }

});
