require("ember-handlebars/ext");
require("ember-views/views/view");
require("ember-handlebars/views/metamorph_view");

/*global ember_assert */

Ember.Handlebars.YieldView = Ember.View.extend(Ember.Metamorph, {
  itemViewClass: Ember.View.extend(Ember.Metamorph),
  templateContext: null,
  template: null,
  blockContainer: null   
});

Ember.Handlebars.yieldHelper = Ember.Object.create({
  
  _findContainingTemplateView: function(view) {
    // We are using _parentView here, because we need to go through the virtual YieldViews, so we can treat them differently.
    if (!view) {
      return view;
    }
    else if (view instanceof Ember.Handlebars.YieldView) {
      var blockContainer = Ember.get(view, 'blockContainer');
      ember_assert("YieldView representing the current block doesn't have a blockContainer set.", blockContainer);
      return this._findContainingTemplateView(Ember.get(blockContainer, '_parentView'));
    }
    else if (view.isVirtual) {
      return this._findContainingTemplateView(Ember.get(view, '_parentView'));
    }
    else {
      return view;
    }
  },

  helper: function(options) {
    var currentView = Ember.Handlebars.yieldHelper._findContainingTemplateView(options.data.view);

    if (currentView && currentView.yieldContent) {
      options.hash.templateContext = currentView.yieldContext;
      options.hash.template = currentView.yieldContent;
      options.hash.blockContainer = currentView;
      return Ember.Handlebars.helpers.view.call(this, 'Ember.Handlebars.YieldView', options);
    }
  }
});

Ember.Handlebars.registerHelper('yield', Ember.Handlebars.yieldHelper.helper);
