require("sproutcore-handlebars/ext");
require("sproutcore-views/views/collection_view");
require("sproutcore-handlebars/views/metamorph_view");

SC.Handlebars.EachView = SC.CollectionView.extend(SC.Metamorph, {
  itemViewClass: SC.View.extend(SC.Metamorph)
});

Handlebars.registerHelper('each', function(path, options) {
  options.hash.contentBinding = path;
  options.hash.preserveContext = true;
  return Handlebars.helpers.collection.call(this, 'SC.Handlebars.EachView', options);
});
