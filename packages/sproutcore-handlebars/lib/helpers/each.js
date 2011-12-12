require("sproutcore-handlebars/ext");
require("sproutcore-views/views/collection_view");
require("sproutcore-handlebars/views/metamorph_view");

Ember.Handlebars.EachView = Ember.CollectionView.extend(Ember.Metamorph, {
  itemViewClass: Ember.View.extend(Ember.Metamorph)
});

Ember.Handlebars.registerHelper('each', function(path, options) {
  options.hash.contentBinding = path;
  options.hash.preserveContext = true;
  return Ember.Handlebars.helpers.collection.call(this, 'Ember.Handlebars.EachView', options);
});
