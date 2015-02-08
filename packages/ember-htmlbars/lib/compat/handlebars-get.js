/**
@module ember
@submodule ember-htmlbars
*/

/**
  Lookup both on root and on window. If the path starts with
  a keyword, the corresponding object will be looked up in the
  template's data hash and used to resolve the path.

  @method get
  @for Ember.Handlebars
  @param {Object} root The object to look up the property on
  @param {String} path The path to be lookedup
  @param {Object} options The template's option hash
  @deprecated
*/
export default function handlebarsGet(root, path, options) {
  Ember.deprecate('Usage of Ember.Handlebars.get is deprecated, use a Component or Ember.Handlebars.makeBoundHelper instead.');

  return options.data.view.getStream(path).value();
}
