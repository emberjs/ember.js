var get = Ember.get, set = Ember.set;

/**
@module ember
@submodule ember-routing
*/

/**
  An `Ember.OutletView` instance will be inserted by the `outlet` helper when
  a view type is not specified.

  This view will define how to show the view content of the outlet 
  based on the current route state.

  The implementation of the `Ember.OutletView` binds its `currentView` content 
  to the value of its outlet in the '`outletSource` view which is setup in 
  the `connectOutlet` call.

  ``` handlebars
    {{outlet}}
  ```

  On the other hand, you can also define your own view to show the content 
  based on your UI requirements:

  ``` handlebars
    {{outlet view=App.NavigationView}}
  ```

*/
Ember.OutletView = Ember.ContainerView.extend(Ember._Metamorph,{
  
  outletName: null,
  outletContent: null,

  init: function () {
    this._super();
    this.bind('currentView', 'outletContent');
  }
                                                  
});
