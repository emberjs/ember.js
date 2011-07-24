// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var application;

var get = SC.get, set = SC.set;

module("SC.Select", {
  setup: function() {
    application = SC.Application.create();
    // force setup since document may not be ready yet.
    get(application, 'eventDispatcher').setup();
  },

  teardown: function() {
    application.destroy();
  }
});

test("should render simple options", function() {
  var select, options = ['Broseidon', 'Brotankhamen', 'Rambro'];

  SC.run(function() {
    //select = SC.Select.create({itemLabelBinding: 'content', itemValueBinding: 'content'});
    select = SC.Select.create({itemViewClass: SC.SelectOption.extend({labelBinding: 'content', valueBinding: 'content'})});
    select.set('content', options);
    select.append();
  });
  
  equals(select.$().find('option').length, 3);
  equals(select.$().find('option:eq(2)').text(), 'Rambro');

  select.destroy();
});

test("should render options with attributeBindings", function() {
  var select, options = [SC.Object.create({label: 'California', value: 'CA'}),
                         SC.Object.create({label: 'Oregon', value: 'OR'})]

  // Tests won't pass unless you wrap creation/appending in the same run loop
  SC.run(function() {
    select = SC.Select.create();
    select.set('content', options);
    select.append();
  });
  
  equals(select.$().find('option').length, 2);
  equals(select.$().find('option:eq(0)').text(), 'California');
  equals(select.$().find('option:eq(0)').val(), 'CA');

  select.destroy();
});

test("should have a default selected option", function() {
  var select, arrayProxy, option = [SC.Object.create({label: 'California', value: 'CA'})];

  arrayProxy = SC.ArrayProxy.create({content: [option]});

  SC.run(function() {
    select = SC.Select.create();
    select.set('content', arrayProxy);
    select.append();
  });
  
  equals(select.get('value'), option);
  equals(arrayProxy.get('selection'), option);

  select.destroy();
});

test("should trigger event upon change", function() {
  var select, options = ['Broseidon', 'Brotankhamen', 'Rambro'];

  SC.run(function() {
    select = SC.Select.create({itemViewClass: SC.SelectOption.extend({labelBinding: 'content', valueBinding: 'content'})});
    select.set('content', options);
    select.append();
  });
  
  SC.run(function() {
    select.$().prop('selectedIndex', 2);
    select.change();
  });

  equals(select.get('value'), 'Rambro');

  select.destroy();
});

test("option label and value should be updateable", function() {
  var select, option = SC.Object.create({label: 'California', value: 'CA'});


  SC.run(function() {
    select = SC.Select.create();
    select.set('content', [option]);
    select.append();
  });

  SC.run(function() {
    option.set('label', 'CALI!');
    option.set('value', 'CA!');
  });
  
  equals(select.$().text(), 'CALI!');
  equals(select.$().val(), 'CA!');

  select.destroy();
});

