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
  var options = ['Broseidon', 'Brotankhamen', 'Rambro'];

  select.set('content', options);

  SC.run(function() {
    select.append();
  });
  
  equals(select.$().find('option').length, 3);
  equals(select.$().find('option:eq(2)').text(), 'Rambro');
});

test("should render options with attributeBindings", function() {
  var options = [{label: 'California', value: 'CA'},
                 {label: 'Oregon', value: 'OR'}]

  select.set('content', options);

  SC.run(function() {
    select.append();
  });
  
  equals(select.$().find('option').length, 2);
  equals(select.$().find('option:eq(0)').text(), 'California');
  equals(select.$().find('option:eq(0)').val(), 'CA');
});

test("should have a default selected option", function() {
  var options = [{label: 'California', value: 'CA'},
                 {label: 'Oregon', value: 'OR'}]

  select.set('content', options);

  SC.run(function() {
    select.append();
  });
  
  equals(select.get('value'), 'CA');
});

test("should trigger event upon change", function() {
  var options = ['Broseidon', 'Brotankhamen', 'Rambro'];

  select.set('content', options);

  SC.run(function() {
    select.append();
  });
  
  SC.run(function() {
    select.$().prop('selectedIndex', 2);
    select.change();
  });

  equals(select.get('value'), 'Rambro');

});
