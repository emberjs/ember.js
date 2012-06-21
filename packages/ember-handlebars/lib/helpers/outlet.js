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
 
  The outlet can handle a subclass of Ember.ContainerView for html settings.
  
      {{outlet}}                                    <- standard 
      {{outlet view}}                               <- standard verbose 
      {{outlet masterView}}                         <- custom outlet name 
      {{outlet App.CustomOutlet}}                   <- custom outlet view 
      {{outlet masterView App.MasterOutlet}}        <- custom outlet name + custom outlet view
  
  @name Handlebars.helpers.outlet
  @param {String} property the property on the controller 
    that holds the view for this outlet
  @param {String} view a subclass of Ember.ContainerView 
    providing html settings for outlet block (id, tag, class, role, ...)
*/
Ember.Handlebars.registerHelper('outlet', function(property, view, options) {
  Ember.assert(
    'you can provide an "outletName" as property and/or a subclass of "Ember.ContainerView as view" ... no more!', 
    arguments.length <= 3
  );

  var container;
  
  var isContainer = function(container) {
    var viewPath = (typeof container === "string" && Ember.getPath(container) !== undefined) ? Ember.getPath(container) : null;
    if (viewPath !== null && Ember.ContainerView.detect(viewPath)) return true;
    else return false;
  };
  
  switch (arguments.length) {
    case 1: 
      if (property && property.data && property.data.isRenderData) {
        options = property;
        property = 'view';
      } 
      break;
    case 2:
      if (view && view.data && view.data.isRenderData) {
        options = view;
        
        if (isContainer(property)) {
          view = property;
          property = 'view';
        }
      }
      break;
    case 3:
      break;
  }
  
  if (!isContainer(view)) {
    view = Ember.ContainerView;
  }
  
  options.hash.currentViewBinding = "controller." + property;
  
  return Ember.Handlebars.helpers.view.call(this, view, options);
});
