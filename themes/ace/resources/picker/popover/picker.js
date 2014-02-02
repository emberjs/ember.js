// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require("resources/picker/popover/popover");

SC.AceTheme.Popover.pickerRenderDelegate = SC.RenderDelegate.create({
  className: 'picker',
  
  render: function(dataSource, context) {
    var preferType = dataSource.get('preferType');
    var pointerPosition = dataSource.get('pointerPos');
    var pointerPositionY = dataSource.get('pointerPosY');

    if (preferType == SC.PICKER_POINTER || preferType == SC.PICKER_MENU_POINTER) {
      context.addClass(pointerPosition);
    }
  },
  
  update: function(dataSource, $) {
    var preferType = dataSource.get('preferType');
    var pointerPosition = dataSource.get('pointerPos');
    var pointerPositionY = dataSource.get('pointerPosY');
    
    if (preferType == SC.PICKER_POINTER || preferType == SC.PICKER_MENU_POINTER) {
      $.addClass(pointerPosition);
    }
    
  }
});