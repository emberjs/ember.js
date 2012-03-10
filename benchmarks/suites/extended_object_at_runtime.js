/*globals before bench*/

bench("extending an object and creating it immediately", function() {
  var klass = Ember.Object.extend({ template: function() {}.property('templateName') });
  klass.create();
});

