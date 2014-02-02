// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

(function() {
  
  var store, Employee, Company, Engineer, Executive, Accountant, Other,
      strobe, colin, charles, matt, yehuda, erin, digits;
  
  module("Polymorphic SC.Record - toMany tests", {
    setup: function() {
      SC.RunLoop.begin();
      store = SC.Store.create();

      Employee = SC.Record.extend({
        name: SC.Record.attr(String)
      });
      Employee.isPolymorphic = YES;

      Company = SC.Record.extend({
        name: SC.Record.attr(String),
        employees: SC.Record.toMany(Employee, {inverse: 'company'})
      });

      Engineer = Employee.extend({
        isEngineer: YES
      });

      Executive = Employee.extend({
        isExecutive: YES
      });

      Accountant = Employee.extend({
        isAccountant: YES
      });

      Other = Employee.extend({
        isOther: YES
      });

      strobe = store.createRecord(Company, {
        name: "Strobe",
        employees: ['1', '2', '3', '4', '5', '6']
      });

      colin = store.createRecord(Engineer, {guid: '1', name: 'Colin'});
      yehuda = store.createRecord(Engineer, {guid: '2', name: 'Yehuda'});
      charles = store.createRecord(Executive, {guid: '3', name: 'Charles'});
      matt = store.createRecord(Executive, {guid: '4', name: 'Matt'});
      erin = store.createRecord(Other, {guid: '5', name: 'Erin'});
      digits = store.createRecord(Accountant, {guid: '6', name: 'P. Diggy'});

    },
    teardown: function() {
      store = Employee = Company = Engineer = Executive = Accountant = Other = null;
      strobe = colin = charles = matt = yehuda = erin = digits = null;
      SC.RunLoop.end();
    }
  });

  function testRecord(record, expected) {
    equals(record, expected, "Record should be the same as what's expected");
    ok(record.constructor === expected.constructor, "Record should be the same subtype as expected");
  }

  test("toOne relationship returns record of correct type", function() {
    var employees = strobe.get('employees');
    testRecord(employees.objectAt(0), colin);
    testRecord(employees.objectAt(1), yehuda);
    testRecord(employees.objectAt(2), charles);
    testRecord(employees.objectAt(3), matt);
    testRecord(employees.objectAt(4), erin);
    testRecord(employees.objectAt(5), digits);
  });

})();
