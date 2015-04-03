/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert
import WithView from "ember-views/views/with_view";

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

    {{#each blogPosts as |post|}}
      <li>{{post.title}}</li>
    {{/each}}
  {{/with}}
  ```

  Without the `as` operator, it would be impossible to reference `user.name` in the example above.

  NOTE: The alias should not reuse a name from the bound property path.
  For example: `{{#with foo as |foo.bar|}}` is not supported because it attempts to alias using
  the first part of the property path, `foo`. Instead, use `{{#with foo.bar as |baz|}}`.

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
export function withHelper(params, hash, options, env) {
  Ember.assert(
    "{{#with}} must be called with an argument. For example, `{{#with foo as |bar|}}{{/with}}`",
    params.length === 1
  );

  Ember.assert(
    "The {{#with}} helper must be called with a block",
    !!options.template
  );

  var view = env.data.view;
  var preserveContext;

  if (options.template.blockParams) {
    preserveContext = true;
  } else {
    Ember.deprecate(
      "Using the context switching form of `{{with}}` is deprecated. " +
      "Please use the block param form (`{{#with bar as |foo|}}`) instead.",
      false,
      { url: 'http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope' }
    );
    preserveContext = false;
  }

  view.appendChild(WithView, {
    _morph: options.morph,
    withValue: params[0],
    preserveContext: preserveContext,
    previousContext: view.get('context'),
    controllerName: hash.controller,
    mainTemplate: options.template,
    inverseTemplate: options.inverse,
    helperName: options.helperName || 'with'
  });
}
