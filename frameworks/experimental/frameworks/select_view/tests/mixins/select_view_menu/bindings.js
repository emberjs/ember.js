module("SelectViewMenu -- Bindings");

function setValues(obj, props, toValue) {
  for (var idx = 0; idx < props.length; idx++) {
    obj.set(props[idx], toValue);
  }
}

function validateValues(obj, props, value) {
  for (var idx = 0; idx < props.length; idx++) {
    equals(obj.get(props[idx]), value);
  }
}

test("Proxying all properties from SelectView to MenuView works.", function() {
  var proxyProperties = [
    'items',
    'itemTitleKey', 'itemIsEnabledKey', 'itemValueKey', 'itemIconKey', 
    'itemHeightKey', 'itemSubMenuKey', 'itemSeparatorKey', 'itemTargetKey',
    'itemActionKey', 'itemCheckboxKey', 'itemShortCutKey',
    'itemKeyEquivalentKey', 'itemDisableMenuFlashKey', 
    
    'preferType', 'preferMatrix'
  ];

  var obj = SC.Object.create({});
  setValues(obj, proxyProperties, 'initial');

  // Bindings won't evaluate until the end of the run loop, so make a run loop
  SC.RunLoop.begin();
  var menu = SC.Object.create(SC.SelectViewMenu, { selectView: obj });
  SC.RunLoop.end();

  // test that initial binding worked
  validateValues(menu, proxyProperties, 'initial');

  // now, test updates
  SC.RunLoop.begin();
  setValues(obj, proxyProperties, 'modified');
  SC.RunLoop.end();

  validateValues(menu, proxyProperties, 'modified');
});
