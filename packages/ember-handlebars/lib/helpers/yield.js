require("ember-handlebars/ext");
require("ember-views/views/view");
require("ember-handlebars/views/metamorph_view");

Ember.Handlebars.YieldView = Ember.View.extend(Ember.Metamorph, {
  itemViewClass: Ember.View.extend(Ember.Metamorph),
  templateContext: null,
  template: null
});

Ember.Handlebars.registerHelper('yield', function(options) {
  var currentView = options.data.view;
  if (currentView.isVirtual) {
    currentView = Ember.get(currentView, 'parentView');
  }
  if (currentView && currentView.yieldContent) {
    options.hash.templateContext = currentView.yieldContext;
    options.hash.template = currentView.yieldContent;
    return Ember.Handlebars.helpers.view.call(this, 'Ember.Handlebars.YieldView', options);
  }
});
