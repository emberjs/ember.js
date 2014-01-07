/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {
  /**
  @module ember
  @submodule ember-routing
  */

  Handlebars.OutletView = Ember.ContainerView.extend(Ember._Metamorph);

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
  Handlebars.registerHelper('outlet', function outletHelper(property, options) {
   
    var outletSource,
        container,
        viewName,
        viewClass,
        viewFullName;

    if (property && property.data && property.data.isRenderData) {
      options = property;
      property = 'main';
    }

    container = options.data.view.container;

    outletSource = options.data.view;
    while (!outletSource.get('template.isTop')) {
      outletSource = outletSource.get('_parentView');
    }

    // provide controller override
    viewName = options.hash.view;

    if (viewName) {
      viewFullName = 'view:' + viewName;
      Ember.assert("Using a quoteless view parameter with {{outlet}} is not supported. Please update to quoted usage '{{outlet \"" + viewName + "\"}}.", options.hashTypes.view !== 'ID');
      Ember.assert("The view name you supplied '" + viewName + "' did not resolve to a view.", container.has(viewFullName));
    }

    viewClass = viewName ? container.lookupFactory(viewFullName) : options.hash.viewClass || Handlebars.OutletView;

    options.data.view.set('outletSource', outletSource);
    options.hash.currentViewBinding = '_view.outletSource._outlets.' + property;

    return Handlebars.helpers.view.call(this, viewClass, options);
  });
});
