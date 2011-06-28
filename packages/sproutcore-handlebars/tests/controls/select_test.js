// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var select, application;

var get = SC.get, set = SC.set;

module("SC.Select", {
  setup: function() {
    application = SC.Application.create();
    select = SC.Select.create();

    // force setup since document may not be ready yet.
    get(application, 'eventDispatcher').setup();
  },

  teardown: function() {
    select.destroy();
    application.destroy();
  }
});

test("should render options", function() {
  var options = ['A', 'B', 'C'];

  select.set('content', options);

  SC.run(function() {
    select.append();
  });
  
  equals(select.$().find('option').length, 3);
  equals(select.$().find('option:eq(2)').text(), 'C');
});

// test("should render options with attributeBindings", function() {
// });
