/**
@module ember
@submodule ember-templates
*/

/**
  Concatenates input params together.

  Example:

  ```handlebars
  {{some-component name=(concat firstName " " lastName)}}

  {{! would pass name="<first name value> <last name value>" to the component}}
  ```

  @public
  @method concat
  @for Ember.Templates.helpers
  @since 1.13.0
*/
export default function concat(params) {
  return params.join('');
}
