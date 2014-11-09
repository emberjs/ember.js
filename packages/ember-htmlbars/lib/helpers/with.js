/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert

import { create as o_create } from "ember-metal/platform";
import isNone from 'ember-metal/is_none';
import { bind } from "ember-htmlbars/helpers/binding";
import WithView from "ember-views/views/with_view";

/**
  Use the `{{with}}` helper when you want to scope context. Take the following code as an example:

  ```handlebars
  <h5>{{user.name}}</h5>

  <div class="role">
    <h6>{{user.role.label}}</h6>
    <span class="role-id">{{user.role.id}}</span>

    <p class="role-desc">{{user.role.description}}</p>
  </div>
  ```

  `{{with}}` can be our best friend in these cases,
  instead of writing `user.role.*` over and over, we use `{{#with user.role}}`.
  Now the context within the `{{#with}} .. {{/with}}` block is `user.role` so you can do the following:

  ```handlebars
  <h5>{{user.name}}</h5>

  <div class="role">
    {{#with user.role}}
      <h6>{{label}}</h6>
      <span class="role-id">{{id}}</span>

      <p class="role-desc">{{description}}</p>
    {{/with}}
  </div>
  ```

  ### `as` operator

  This operator aliases the scope to a new name. It's helpful for semantic clarity and to retain
  default scope or to reference from another `{{with}}` block.

  ```handlebars
  // posts might not be
  {{#with user.posts as blogPosts}}
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
  the specified controller with the new context as its content.

  This is very similar to using an `itemController` option with the `{{each}}` helper.

  ```handlebars
  {{#with users.posts controller='userBlogPosts'}}
    {{!- The current context is wrapped in our controller instance }}
  {{/with}}
  ```

  In the above example, the template provided to the `{{with}}` block is now wrapped in the
  `userBlogPost` controller, which provides a very elegant way to decorate the context with custom
  functions/properties.

  @method with
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
export function withHelper(params, options, env) {

  Ember.assert(
    '{{#with foo}} must be called with a single argument or the use the '+
    '{{#with foo as bar}} syntax',
    params.length === 1
  );

  Ember.assert("The {{#with}} helper must be called with a block", options.render);

  var source, keyword;
  var preserveContext, context;
  if (options.types[0] === 'id') {
    source = params[0];
    preserveContext = false;
    context = source.value();
  } else if (options.types[0] === 'keyword') {
    source = params[0].stream;
    keyword = params[0].to;
    context = this.get('context');

    var localizedOptions = o_create(options);

    localizedOptions.keywords = {};
    localizedOptions.keywords[keyword] = source;
    localizedOptions.hash.keywordName = keyword;

    options = localizedOptions;
    preserveContext = true;
  }

  bind.call(this, source, options, env, preserveContext, exists, undefined, undefined, WithView);
}

function exists(value) {
  return !isNone(value);
}
