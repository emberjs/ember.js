require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {
  /**
  @module ember
  @submodule ember-old-router
  */

  Handlebars.OutletView = Ember.ContainerView.extend(Ember._Metamorph);

  /**
    The `outlet` helper allows you to specify that the current
    view's controller will fill in the view for a given area.

    ``` handlebars
    {{outlet}}
    ```

    By default, when the the current controller's `view` property changes, the
    outlet will replace its current view with the new view. You can set the
    `view` property directly, but it's normally best to use `connectOutlet`.

    ``` javascript
    # Instantiate App.PostsView and assign to `view`, so as to render into outlet.
    controller.connectOutlet('posts');
    ```

    You can also specify a particular name other than `view`:

    ``` handlebars
    {{outlet masterView}}
    {{outlet detailView}}
    ```

    Then, you can control several outlets from a single controller.

    ``` javascript
    # Instantiate App.PostsView and assign to controller.masterView.
    controller.connectOutlet('masterView', 'posts');
    # Also, instantiate App.PostInfoView and assign to controller.detailView.
    controller.connectOutlet('detailView', 'postInfo');
    ```

    @method outlet
    @for Ember.Handlebars.helpers
    @param {String} property the property on the controller
      that holds the view for this outlet
  */
  Handlebars.registerHelper('outlet', function(property, options) {
    if (property && property.data && property.data.isRenderData) {
      options = property;
      property = 'view';
    }

    options.hash.currentViewBinding = "view.context." + property;

    return Handlebars.helpers.view.call(this, Handlebars.OutletView, options);
  });

});
