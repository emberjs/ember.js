/**
@module ember
@submodule ember-templates
*/

import shouldDisplay from '../streams/should_display';

/**
  Use the `{{with}}` helper when you want to alias a property to a new name. This is helpful
  for semantic clarity as it allows you to retain default scope or to reference a property from another
  `{{with}}` block.

  If the aliased property is "falsey", for example: `false`, `undefined` `null`, `""`, `0`, NaN or
  an empty array, the block will not be rendered.

  ```handlebars
  {{! Will only render if user.posts contains items}}
  {{#with user.posts as |blogPosts|}}
    <div class="notice">
      There are {{blogPosts.length}} blog posts written by {{user.name}}.
    </div>
    {{#each blogPosts as |post|}}
      <li>{{post.title}}</li>
    {{/each}}
  {{/with}}
  ```

  Without the `as` operator, it would be impossible to reference `user.name` in the example above.

  NOTE: The alias should not reuse a name from the bound property path.
  For example: `{{#with foo.bar as |foo|}}` is not supported because it attempts to alias using
  the first part of the property path, `foo`. Instead, use `{{#with foo.bar as |baz|}}`.

  @method with
  @for Ember.Templates.helpers
  @param {Object} options
  @return {String} HTML string
  @public
*/

export default function withHelper(params, hash, options) {
  if (shouldDisplay(params[0])) {
    options.template.yield([params[0]]);
  } else if (options.inverse && options.inverse.yield) {
    options.inverse.yield([]);
  }
}
