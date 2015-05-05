/**
@module ember
@submodule ember-htmlbars
*/

import normalizeSelf from "ember-htmlbars/utils/normalize-self";

/**
  Use the `{{with}}` helper when you want to aliases the to a new name. It's helpful
  for semantic clarity and to retain default scope or to reference from another
  `{{with}}` block.
  ```handlebars
  // posts might not be
  {{#with user.posts as |blogPosts|}}
    <div class="notice">
      There are {{blogPosts.length}} blog posts written by {{user.name}}.
    </div>
    {{#each post in blogPosts}}
      <li>{{post.title}}</li>
    {{/each}}
  {{/with}}
  ```
  Without the `as` operator, it would be impossible to reference `user.name` in the example above.
  NOTE: The alias should not reuse a name from the bound property path.
  For example: `{{#with foo.bar as foo}}` is not supported because it attempts to alias using
  the first part of the property path, `foo`. Instead, use `{{#with foo.bar as baz}}`.
  ### `controller` option
  Adding `controller='something'` instructs the `{{with}}` helper to create and use an instance of
  the specified controller wrapping the aliased keyword.
  This is very similar to using an `itemController` option with the `{{each}}` helper.
  ```handlebars
  {{#with users.posts controller='userBlogPosts' as |posts|}}
    {{!- `posts` is wrapped in our controller instance }}
  {{/with}}
  ```
  In the above example, the `posts` keyword is now wrapped in the `userBlogPost` controller,
  which provides an elegant way to decorate the context with custom
  functions/properties.
  @method with
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/

export default function withHelper(params, hash, options) {
  var preserveContext = false;

  if (options.template.arity !== 0) {
    preserveContext = true;
  }

  if (preserveContext) {
    this.yield([params[0]]);
  } else {
    let self = normalizeSelf(params[0]);
    if (hash.controller) {
      self = {
        hasBoundController: true,
        controller: hash.controller,
        self: self
      };
    }

    this.yield([], self);
  }
}
