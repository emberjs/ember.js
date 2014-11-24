/**
@module ember
@submodule ember-handlebars
*/

import Ember from "ember-metal/core"; // Ember.assert

import { create as o_create } from "ember-metal/platform";
import isNone from 'ember-metal/is_none';
import { bind } from "ember-handlebars/helpers/binding";
import WithView from "ember-views/views/with_view";

/**
  Use the `{{with}}` helper when you want to aliases the to a new name. It's helpful
  for semantic clarity and to retain default scope or to reference from another
  `{{with}}` block.

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
  the specified controller wrapping the aliased keyword.

  This is very similar to using an `itemController` option with the `{{each}}` helper.

  ```handlebars
  {{#with users.posts as posts controller='userBlogPosts'}}
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
export default function withHelper(contextPath) {
  var options = arguments[arguments.length - 1];
  var view = options.data.view;
  var bindContext, preserveContext;
  var helperName = 'with';

  if (arguments.length === 4) {
    Ember.assert("If you pass more than one argument to the with helper," +
                 " it must be in the form #with foo as bar", arguments[1] === "as");

    var keywordName = arguments[2];

    if (contextPath) {
      helperName += ' ' + contextPath + ' as ' + keywordName;
    }

    Ember.assert("You must pass a block to the with helper", options.fn && options.fn !== Handlebars.VM.noop);

    var localizedOptions = o_create(options);
    localizedOptions.data = o_create(options.data);

    localizedOptions.keywords = {};
    localizedOptions.keywords[keywordName] = view.getStream(contextPath);

    localizedOptions.hash.keywordName = keywordName;

    bindContext = this;
    options = localizedOptions;
    preserveContext = true;
  } else {
    Ember.deprecate('Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

    Ember.assert("You must pass exactly one argument to the with helper", arguments.length === 2);
    Ember.assert("You must pass a block to the with helper", options.fn && options.fn !== Handlebars.VM.noop);

    helperName += ' ' + contextPath;
    bindContext = options.contexts[0];
    preserveContext = false;
  }

  options.helperName = helperName;

  return bind.call(bindContext, contextPath, options, preserveContext, exists, undefined, undefined, WithView);
}

function exists(value) {
  return !isNone(value);
}
