/**
@module ember
@submodule ember-routing-htmlbars
*/

import Ember from "ember-metal/core"; // assert

/**
  The `outlet` helper is a placeholder that the router will fill in with
  the appropriate template based on the current state of the application.

  ``` handlebars
  {{outlet}}
  ```

  By default, a template based on Ember's naming conventions will be rendered
  into the `outlet` (e.g. `App.PostsRoute` will render the `posts` template).

  You can render a different template by using the `render()` method in the
  route's `renderTemplate` hook. The following will render the `favoritePost`
  template into the `outlet`.

  ``` javascript
  App.PostsRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('favoritePost');
    }
  });
  ```

  You can create custom named outlets for more control.

  ``` handlebars
  {{outlet 'favoritePost'}}
  {{outlet 'posts'}}
  ```

  Then you can define what template is rendered into each outlet in your
  route.


  ``` javascript
  App.PostsRoute = Ember.Route.extend({
    renderTemplate: function() {
      this.render('favoritePost', { outlet: 'favoritePost' });
      this.render('posts', { outlet: 'posts' });
    }
  });
  ```

  You can specify the view that the outlet uses to contain and manage the
  templates rendered into it.

  ``` handlebars
  {{outlet view='sectionContainer'}}
  ```

  ``` javascript
  App.SectionContainer = Ember.ContainerView.extend({
    tagName: 'section',
    classNames: ['special']
  });
  ```

  @method outlet
  @for Ember.Handlebars.helpers
  @param {String} property the property on the controller
    that holds the view for this outlet
  @return {String} HTML string
*/
export function outletHelper(params, hash, options, env) {
  var viewName;
  var viewClass;
  var viewFullName;
  var view = env.data.view;

  Ember.assert(
    "Using {{outlet}} with an unquoted name is not supported.",
    params.length === 0 || typeof params[0] === 'string'
  );

  var property = params[0] || 'main';


  // provide controller override
  viewName = hash.view;

  if (viewName) {
    viewFullName = 'view:' + viewName;
    Ember.assert(
      "Using a quoteless view parameter with {{outlet}} is not supported." +
      " Please update to quoted usage '{{outlet ... view=\"" + viewName + "\"}}.",
      typeof hash.view === 'string'
    );
    Ember.assert(
      "The view name you supplied '" + viewName + "' did not resolve to a view.",
      view.container._registry.has(viewFullName)
    );
  }

  viewClass = viewName ? view.container.lookupFactory(viewFullName) : hash.viewClass || view.container.lookupFactory('view:-outlet');
  hash._outletName = property;
  options.helperName = options.helperName || 'outlet';
  return env.helpers.view.helperFunction.call(this, [viewClass], hash, options, env);
}
