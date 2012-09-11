require('ember-handlebars/helpers/view');

/**
@module ember
@submodule ember-handlebars
*/

Ember.Handlebars.OutletView = Ember.ContainerView.extend(Ember._Metamorph);

/**
  The `outlet` helper allows you to specify that the current
  view's controller will fill in the view for a given area.

  ``` handlebars
  {{outlet}}
  ```

  By default, when the the current controller's `view`
  property changes, the outlet will replace its current
  view with the new view.

  ``` javascript
  controller.set('view', someView);
  ```

  You can also specify a particular name, other than view:

  ``` handlebars
  {{outlet masterView}}
  {{outlet detailView}}
  ```

  Then, you can control several outlets from a single
  controller:

  ``` javascript
  controller.set('masterView', postsView);
  controller.set('detailView', postView);
  ```

  @method outlet
  @for Ember.Handlebars.helpers
  @param {String} property the property on the controller
    that holds the view for this outlet
*/
Ember.Handlebars.registerHelper('outlet', function(property, options) {
  if (property && property.data && property.data.isRenderData) {
    options = property;
    property = 'view';
  }

  options.hash.currentViewBinding = "controller." + property;

  return Ember.Handlebars.helpers.view.call(this, Ember.Handlebars.OutletView, options);
});
