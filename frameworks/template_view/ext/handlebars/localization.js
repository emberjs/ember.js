sc_require('ext/handlebars');

Handlebars.registerHelper('loc', function(property) {
  return SC.String.loc(property);
});
