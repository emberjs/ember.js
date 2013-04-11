require("ember-handlebars/controls/checkbox");
require("ember-handlebars/controls/text_field");
require("ember-handlebars/controls/button");
require("ember-handlebars/controls/text_area");
require("ember-handlebars/controls/select");

function normalizeHash(hash, hashTypes) {
  for (var prop in hash) {
    if (hashTypes[prop] === 'ID') {
      hash[prop + 'Binding'] = hash[prop];
      delete hash[prop];
    }
  }
}

Ember.Handlebars.registerHelper('input', function(options) {
  Ember.assert('You can only pass attributes to the `input` helper, not arguments', arguments.length < 2);

  var hash = options.hash,
      types = options.hashTypes,
      inputType = hash.type,
      onEvent = hash.on;

  delete hash.type;
  delete hash.on;

  normalizeHash(hash, types);

  if (inputType === 'checkbox') {
    return Ember.Handlebars.helpers.view.call(this, Ember.Checkbox, options);
  } else {
    hash.type = inputType;
    hash.onEvent = onEvent || 'enter';
    return Ember.Handlebars.helpers.view.call(this, Ember.TextField, options);
  }
});

Ember.Handlebars.registerHelper('textarea', function(options) {
  Ember.assert('You can only pass attributes to the `textarea` helper, not arguments', arguments.length < 2);

  var hash = options.hash,
      types = options.hashTypes;

  normalizeHash(hash, types);
  return Ember.Handlebars.helpers.view.call(this, Ember.TextArea, options);
});
