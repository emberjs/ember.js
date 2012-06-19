require('ember-handlebars/helpers/view');

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

  You can also specify a particular containerView for stuff like id, tag, aria-role 

      {{outlet masterView App.MyMasterContainerView}}
      {{outlet detailView App.MyDetailContainerView}}
      
  for the basic outlet use 'view' for naming the outlet
  
      {{outlet view App.MyCustomContainerView}}

  Then, you can control several outlets from a single
  controller:

      controller.set('masterView', postsView);
      controller.set('detailView', postView);

  @name Handlebars.helpers.outlet
  @param {String} property the property on the controller that holds the view for this outlet
  @param {String} view the containerView defining the outlet view settings
*/
Ember.Handlebars.registerHelper('outlet', function(property, view, options) {
  Ember.assert('you can provide an "outletName" and a custom "Ember.ContainerView" ... no more!', arguments.length <= 3);
  
  if (property && property.data && property.data.isRenderData) {
    options = property;
    property = 'view';
  } else if (view && view.data && view.data.isRenderData) {
    options = view;
  }

  if(typeof view !== "string") {
    view = Ember.ContainerView;
  }
  
  options.hash.currentViewBinding = "controller." + property;

  return Ember.Handlebars.helpers.view.call(this, Ember.ContainerView, options);
});