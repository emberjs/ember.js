import "ember";

QUnit.module("Global API Tests");

function confirmExport(property) {
  ok(Ember.get(this, property) + ' is exported propertly');
}

test('confirm public functions and properties are exported properly', function() {
  confirmExport('Ember.DefaultResolver');
  confirmExport('Ember.generateController');
});
