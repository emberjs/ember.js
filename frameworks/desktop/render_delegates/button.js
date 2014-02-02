// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  Renders and updates the HTML representation of a button.
*/
SC.BaseTheme.buttonRenderDelegate = SC.RenderDelegate.create({
  className: 'button',

  //
  // SIZE DEFINITIONS
  //
  'sc-small-size': {
    height: 18,
    autoResizePadding: { width: 15, height: 0 }
  },

  'sc-regular-size': {
    height: 24,
    autoResizePadding: { width: 20, height: 0 }
  },

  'sc-huge-size': {
    height: 30,
    autoResizePadding: { width: 30, height: 0 }
  },

  'sc-jumbo-size': {
    height: 44,
    autoResizePadding: { width: 50, height: 0 }
  },


  //
  // RENDERING LOGIC
  //

  /**
    Called when we need to create the HTML that represents the button.

    @param {SC.Object} dataSource the object containing the information on how to render the button
    @param {SC.RenderContext} context the render context instance
  */
  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var toolTip     = dataSource.get('toolTip'),
      isSelected  = dataSource.get('isSelected') || NO,
      isActive    = dataSource.get('isActive') || NO,
      isDefault   = dataSource.get('isDefault') || NO,
      isCancel    = dataSource.get('isCancel') || NO,
      isToggle    = (dataSource.get('buttonBehavior') === SC.TOGGLE_BEHAVIOR),
      labelId     = SC.guidFor(dataSource) + '-label';

    context.setClass({
      'icon': !!dataSource.get('icon'),
      'def':  isDefault,
      'cancel': isCancel && !isDefault,
      'active': isActive,
      'sel': isSelected
    });

    // Set the toolTip.
    if (toolTip) {
      context.setAttr('title', toolTip);
    }

    this.includeSlices(dataSource, context, SC.THREE_SLICE);
    // accessibility
    if(dataSource.get('isSegment')){
      context.setAttr('aria-selected', isSelected.toString());
    }else if(isToggle) {
      context.setAttr('aria-pressed', isActive.toString());
    }

    context.setAttr('aria-labelledby', labelId);

    // Create the inner label element that contains the text and, optionally,
    // an icon.
    context = context.begin('label').addClass('sc-button-label').id(labelId);
    dataSource.get('theme').labelRenderDelegate.render(dataSource, context);
    context = context.end();

    if (dataSource.get('supportFocusRing')) {
      context = context.begin('div').addClass('focus-ring');
      this.includeSlices(dataSource, context, SC.THREE_SLICE);
      context = context.end();
    }
  },

  /**
    Called when one or more display properties have changed and we need to
    update the HTML representation with the new values.

    @param {SC.Object} dataSource the object containing the information on how to render the button
    @param {SC.RenderContext} jquery the jQuery object representing the HTML representation of the button
  */
  update: function(dataSource, jquery) {
    var isToggle = (dataSource.get('buttonBehavior') === SC.TOGGLE_BEHAVIOR),
      isDefault = dataSource.get('isDefault'),
      isCancel = dataSource.get('isCancel'),
      toolTip = dataSource.get('toolTip');

    this.updateSizeClassName(dataSource, jquery);

    if (dataSource.get('isActive')) {
      jquery.addClass('active');
    }

    if (dataSource.get('isSegment')) {
      jquery.attr('aria-selected', dataSource.get('isSelected').toString());
    } else if (isToggle) {
      jquery.attr('aria-pressed', dataSource.get('isActive').toString());
    }

    // Update the toolTip.
    if (toolTip) {
      jquery.attr('title', toolTip);
    } else {
      jquery.removeAttr('title');
    }

    jquery.setClass('icon', !!dataSource.get('icon'));
    jquery.setClass('def', !!isDefault);
    jquery.setClass('cancel', !!isCancel && !isDefault);

    dataSource.get('theme').labelRenderDelegate.update(dataSource, jquery.find('label'));
  },

  /**
    Returns the layer to be used for auto resizing.
  */
  getRenderedAutoResizeLayer: function(dataSource, jq) {
    return jq.find('.sc-button-label')[0];
  }
});
