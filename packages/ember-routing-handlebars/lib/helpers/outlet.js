/**
@module ember
@submodule ember-routing-handlebars
*/

import Ember from "ember-metal/core"; // assert
import { set } from "ember-metal/property_set";
import { viewHelper } from "ember-handlebars/helpers/view";
import { OutletView } from "ember-routing-views/views/outlet";

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
export function outletHelper(property, options) {
  var outletSource;
  var viewName;
  var viewClass;
  var viewFullName;

  if (property && property.data && property.data.isRenderData) {
    options = property;
    property = 'main';
  }

  Ember.deprecate(
    "Using {{outlet}} with an unquoted name is not supported. " +
    "Please update to quoted usage '{{outlet \"" + property + "\"}}'.",
    arguments.length === 1 || options.types[0] === 'STRING'
  );

  var view = options.data.view;
  var container = view.container;

  outletSource = view;
  while (!outletSource.get('template.isTop')) {
    outletSource = outletSource.get('_parentView');
  }
  set(view, 'outletSource', outletSource);

  // provide controller override
  viewName = options.hash.view;

  if (viewName) {
    viewFullName = 'view:' + viewName;
    Ember.assert(
      "Using a quoteless view parameter with {{outlet}} is not supported." +
      " Please update to quoted usage '{{outlet ... view=\"" + viewName + "\"}}.",
      options.hashTypes.view !== 'ID'
    );
    Ember.assert(
      "The view name you supplied '" + viewName + "' did not resolve to a view.",
      container.has(viewFullName)
    );
  }

  viewClass = viewName ? container.lookupFactory(viewFullName) : options.hash.viewClass || OutletView;
  options.types = [ 'ID' ];

  options.hash.currentViewBinding = '_view.outletSource._outlets.' + property;
  options.hashTypes.currentViewBinding = 'STRING';

  options.helperName = options.helperName || 'outlet';

  return viewHelper.call(this, viewClass, options);
}
