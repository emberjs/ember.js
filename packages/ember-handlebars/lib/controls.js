require("ember-handlebars/controls/checkbox");
require("ember-handlebars/controls/text_field");
require("ember-handlebars/controls/text_area");

function normalizeHash(hash, hashTypes) {
  for (var prop in hash) {
    if (hashTypes[prop] === 'ID') {
      hash[prop + 'Binding'] = hash[prop];
      delete hash[prop];
    }
  }
}

/**
 * `{{input}}` inserts a new instance of either Ember.TextField or
 * Ember.Checkbox, depending on the `type` option passed in. If no `type`
 * is supplied it defaults to Ember.TextField.
 *
 * @method input
 * @for Ember.Handlebars.helpers
 * @param {Hash} options
 */
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
    hash.type = inputType || 'text';
    hash.onEvent = onEvent || 'enter';
    return Ember.Handlebars.helpers.view.call(this, Ember.TextField, options);
  }
});

/**
 * `{{textarea}}` inserts a new instance of Ember.TextArea into the template
 * passing its options to `Ember.TextArea`'s `create` method.
 *
 * @method textarea
 * @for Ember.Handlebars.helpers
 * @param {Hash} options
 */
Ember.Handlebars.registerHelper('textarea', function(options) {
  Ember.assert('You can only pass attributes to the `textarea` helper, not arguments', arguments.length < 2);

  var hash = options.hash,
      types = options.hashTypes;

  normalizeHash(hash, types);
  return Ember.Handlebars.helpers.view.call(this, Ember.TextArea, options);
});
