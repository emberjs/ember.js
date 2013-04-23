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
    {{outlet favoritePost}}
    {{outlet posts}}
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


    By default, outlet will create an `Ember.OutletView` instance to show the
    view content based on the route state.

    But you can also define how this content can be shown based on the view property.

    ``` handlebars
      {{outlet view="App.NavigationView"}}
    ```

    ``` handlebars

    App.NavigationView = Em.View.extend({

      // you can observe `outletContent` changes to represent
      // as you desire the new route content
      outletContent: null

    });

    ```

    @method outlet
    @for Ember.Handlebars.helpers
    @param {String} property the property on the controller
      that holds the view for this outlet
  */
  Handlebars.registerHelper('outlet', function(property, options) {
    var outletSource;
    if (property && property.data && property.data.isRenderData) {
      options = property;
      property = 'main';
    }
    
    var viewClass = options.hash.view; 
    if ( viewClass ) {
      viewClass = Ember.get(viewClass);
      delete options.hash.view;
    } else {
      viewClass = Ember.OutletView;
    }

    outletSource = options.data.view;
    while (!(outletSource.get('template.isTop'))){
      outletSource = outletSource.get('_parentView');
    }

    options.data.view.set('outletSource', outletSource);

    options.hash.outletName = property;
    options.hash.outletContentBinding = '_view.outletSource._outlets.' + property;

    return Handlebars.helpers.view.call(this, viewClass, options);
  });
});
