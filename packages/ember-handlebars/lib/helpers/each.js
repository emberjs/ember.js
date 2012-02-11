require("ember-handlebars/ext");
require("ember-views/views/collection_view");
require("ember-handlebars/views/metamorph_view");

Ember.Handlebars.EachView = Ember.CollectionView.extend(Ember.Metamorph, {
  itemViewClass: Ember.View.extend(Ember.Metamorph)
});

Ember.Handlebars.registerHelper('each', function(path, options) {
  options.hash.contentBinding = path;
  options.hash.preserveContext = true;

  // Set up emptyView as a metamorph with no tag
  options.hash.itemTagName = '';
  options.hash.emptyViewClass = Ember.View.extend(Ember.Metamorph);

  return Ember.Handlebars.helpers.collection.call(this, 'Ember.Handlebars.EachView', options);
});
