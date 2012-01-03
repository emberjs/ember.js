require("ember-handlebars/ext");
require("ember-views/views/collection_view");
require("ember-handlebars/views/metamorph_view");

Ember.Handlebars.EachView = Ember.CollectionView.extend(Ember.Metamorph, {
  itemViewClass: Ember.View.extend(Ember.Metamorph)
});

Ember.Handlebars.registerHelper('each', function(path, options) {
  options.hash.contentBinding = path;
  options.hash.preserveContext = true;

  // Use Handlebars #each helper
  if (this.isUnboundBlock) {
    var context = (options.contexts && options.contexts[0]) || this;
    var raw = Ember.getPath(context, path);
    return Handlebars.helpers.each(raw, options);
  }
  return Ember.Handlebars.helpers.collection.call(this, 'Ember.Handlebars.EachView', options);
});
