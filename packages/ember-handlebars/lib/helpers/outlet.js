require('ember-handlebars/helpers/view');

Ember.Handlebars.OutletView = Ember.ContainerView.extend(Ember._Metamorph);

/**
  The `outlet` helper allows you to specify that the current
  view's controller will fill in the view for a given area.

      {{outlet}}

  By default, when the the current controller's `view`
  property changes, the outlet will replace its current
  view with the new view.

      controller.set('view', someView);

  You can also specify a particular name, other than view:

      {{outlet masterView}}
      {{outlet detailView}}

  Then, you can control several outlets from a single
  controller:

      controller.set('masterView', postsView);
      controller.set('detailView', postView);

  @name Handlebars.helpers.outlet
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
