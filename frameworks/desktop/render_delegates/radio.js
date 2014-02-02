// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Renders and updates the DOM representation of a radio button (a single button,
  not the group).

  Expected Properties
  -----------------------------------

   - `isSelected`
   - `isActive`
   - `isMixed`
   - `title`

  Optional Properties
  -----------------------------------

   - `width` -- an optional width of the radio button
   - `labelRenderDelegate` properties

*/
SC.BaseTheme.radioRenderDelegate = SC.RenderDelegate.create({
  className: 'radio',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var theme = dataSource.get('theme');

    var isSelected = dataSource.get('isSelected'),
        width = dataSource.get('width'),
        labelId = SC.guidFor(dataSource) + '-label';

    context.setClass({
      active: dataSource.get('isActive'),
      mixed: dataSource.get('isMixed'),
      sel: dataSource.get('isSelected'),
      disabled: !dataSource.get('isEnabled')
    });

    //accessing accessibility
    context.setAttr('role', 'radio');
    context.setAttr('aria-checked', isSelected);
    context.setAttr('aria-labelledby', labelId);
    context.setAttr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');

    if (width) context.setStyle('width', width);

    context.push('<span class = "button"></span>');

    context = context.begin('span').addClass('sc-button-label').id(labelId);
    theme.labelRenderDelegate.render(dataSource, context);
    context = context.end();
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var theme = dataSource.get('theme');

    var isSelected = dataSource.get('isSelected'),
        width = dataSource.get('width'),
        value = dataSource.get('value');

    jquery.setClass({
      active: dataSource.get('isActive'),
      mixed: dataSource.get('isMixed'),
      sel: dataSource.get('isSelected'),
      disabled: !dataSource.get('isEnabled')
    });

    jquery.attr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');
    jquery.attr('aria-checked', isSelected);
    jquery.css('width', width ? width : null);

    theme.labelRenderDelegate.update(dataSource, jquery.find('.sc-button-label'));
  }
});
