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

  Then, you can control several outlets from a single
  controller:

      controller.set('masterView', postsView);
      controller.set('detailView', postView);

  The outlet can handle a custom ContainerView.
  the custom ContainerView name must:
  - have a dot (required for regex test)
  - be post fixed with Outlet instead of View (required for regex test)
  
      {{outlet}}                                    <- standard 
      {{outlet view}}                               <- standard verbose 
      {{outlet masterView}}                         <- custom outlet name 
      {{outlet App.CustomOutlet}}                   <- custom outlet view 
      {{outlet masterView App.MasterOutlet}}        <- custom outlet name + custom outlet view
      {{outlet App.MasterOutlet masterView}}        <- custom outlet view + custom outlet name  
  
  @name Handlebars.helpers.outlet
  @param {String} property the property on the controller that holds the view for this outlet
  @param {String} view the custom ContainerView providing html data for outlet block (id, tag, class, aria, ...)
*/
Ember.Handlebars.registerHelper('outlet', function(property, view, options) {
  Ember.assert('you can provide an "outletName" and/or a custom "Ember.ContainerView" ... no more!', arguments.length <= 3);
  
  var regex = /\.([a-zA-Z]{1}[a-z0-9]*)*Outlet$/;
  
  if (property && property.data && property.data.isRenderData) {
    options = property;
    property = 'view';
  } 
  else if (view && view.data && view.data.isRenderData) {
    options = view;
    
    if (regex.test(property)) {
      view = property;
      property = 'view';
    }
  }
  
  if (typeof property === "string" && typeof view === "string") {
    if (regex.test(property) && !regex.test(view)) {
      var v = view;
      view = property;
      property = v;
      v = null;
    }
  }
  
  if (typeof view !== "string") {
    view = Ember.ContainerView;
  } 
  
  options.hash.currentViewBinding = "controller." + property;

  return Ember.Handlebars.helpers.view.call(this, view, options);
});
