// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class
  Renders and updates the HTML representation of a group of radio buttons.

  Expects Properties
  -------------------------------

   - `items` -- a collection of data sources for radioRenderDelegates
   - `layoutDirection`
   - `isEnabled`

  Extended API
  --------------------------------
  As this encompasses an entire group, it must provide a way to determine
  which radio button is the target of an event. The indexForEvent method
  does exactly this, and all radioGroupRenderDelegates _must_ support it.

  Also, as it would be low-performance to update any but the changed radio
  button, there is a method to update a specific index.
*/
SC.BaseTheme.radioGroupRenderDelegate = SC.RenderDelegate.create({
  className: 'radio-group',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var theme = dataSource.get('theme'),
        name = SC.guidFor(this),
        items = dataSource.get('items'), idx, len = items.length, item;


    context.addClass(dataSource.get('layoutDirection'));
    context.setAttr('role', 'radiogroup');
    context.setAttr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');

    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      context = context.begin('div')
        .addClass('radio-' + idx)
        .setAttr('index', idx)
        .addClass(theme.classNames)
        .addClass(theme.radioRenderDelegate.className)

        // so we can identify it in event handling
        .addClass('sc-radio-button');

      theme.radioRenderDelegate.render(item, context);

      context = context.end();
    }

    // store the radio count so we can know when to regenerate in update
    dataSource.get('renderState').radioCount = idx;
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var theme = dataSource.get('theme'),
        name = SC.guidFor(this),
        items = dataSource.get('items'), idx, len = items.length, item;

    jquery.addClass(dataSource.get('layoutDirection'));
    jquery.attr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');

    if (dataSource.get('renderState').radioCount !== len) {
      // just regenerate if the count has changed. It would be better
      // to be intelligent, but that would also be rather complex
      // for such a rare case.
      var context = SC.RenderContext(jquery[0]);
      this.render(dataSource, context);
      context.update();
      return;
    }

    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      theme.radioRenderDelegate.update(item, jquery.find('.radio-' + idx));
    }
  },

  /**
    Updates the radio button at the specified index.

    @param {Object} dataSource The RenderDelegate data source.
    @param {jQuery} jquery A jQuery instance with the DOM for this radio group.
    @param {Number} index The index of the radio to update.
  */
  updateRadioAtIndex: function(dataSource, jquery, index) {
    var item = dataSource.get('items')[index];
    dataSource.get('theme').radioRenderDelegate.update(item, jquery.find('.radio-' + index));
  },

  /**
    Returns the index of the radio button that was the target of the
    supplied event.

    @param {Object} dataSource The RenderDelegate data source.
    @param {jQuery} jquery A jQuery instance with the DOM for this radio group.
    @param {SC.Event SC.Touch} event The event or SC.Touch object.
  */

  indexForEvent: function(dataSource, jquery, evt) {
    var index = $(evt.target).closest('.sc-radio-button').attr('index');
    if (isNaN(index)) return undefined;
    return parseInt(index, 0);
  }
});
