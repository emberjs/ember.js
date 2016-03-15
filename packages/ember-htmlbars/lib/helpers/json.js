/**
@module ember
@submodule ember-templates
*/

/**
  Converts an object to his JSON representation. Convenient to show data in
  models. If the object has no JSON method, it will show the string
  representation.
  For example:

  ```handlebars
  {{json user}}
  ```

  ```html
  { name: 'Name' }
  ```

  @method json
  @for Ember.Templates.helpers
  @param {String} object The object to show
  @public
*/
export default function jsonHelper(params) {
  var object = params[0];
  console.log(object.toJSON);
  if (object.toJSON) {
    return JSON.stringify(object.toJSON());
  } else {
    return object;
  }
}
