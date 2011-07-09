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

  //select = SC.Select.create({itemLabelBinding: 'content', itemValueBinding: 'content'});
  select = SC.Select.create({itemViewClass: SC.SelectOption.extend({labelBinding: 'content', valueBinding: 'content'})});
  var options = ['Broseidon', 'Brotankhamen', 'Rambro'];

  select.set('content', options);

  SC.run(function() {
    select.append();
  });
  
  equals(select.$().find('option').length, 3);
  equals(select.$().find('option:eq(2)').text(), 'Rambro');
});

test("should render options with attributeBindings", function() {
  var options = [SC.Object.create({label: 'California', value: 'CA'}),
                 SC.Object.create({label: 'Oregon', value: 'OR'})]

  select.set('content', options);

  SC.run(function() {
    select.append();
  });
  
  equals(select.$().find('option').length, 2);
  equals(select.$().find('option:eq(0)').text(), 'California');
  equals(select.$().find('option:eq(0)').val(), 'CA');
});

test("should have a default selected option", function() {
  var options = [SC.Object.create({label: 'California', value: 'CA'})];

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

test("option value should be updateable", function() {
  var option = SC.Object.create({label: 'California', value: 'CA'});

  select.set('content', [option]);

  SC.run(function() {
    select.append();
  });

  SC.run(function() {
    option.set('value', 'CALI!');
  });
  
  equals(select.get('value'), 'CALI!');
});

