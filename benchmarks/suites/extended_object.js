/*globals before bench*/

var klass;

before(function() {
  var klass = Ember.Object.extend({ template: function() {}.property('templateName') });
});

bench("creating an object that was already extended", function() {
  klass.create();
});
