import "ember";

QUnit.module("Global API Tests");

function confirmExport(property) {
  QUnit.test('confirm ' + property + ' is exported', function() {
    ok(Ember.get(window, property) + ' is exported propertly');
  });
}

confirmExport('Ember.DefaultResolver');
confirmExport('Ember.generateController');
