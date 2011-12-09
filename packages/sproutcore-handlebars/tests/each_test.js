var people, view;

module("the #each helper", {
  setup: function() {
    template = templateFor("{{#each people}}{{name}}{{/each}}");
    people = SC.A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    view = SC.View.create({
      template: template,
      people: people
    });

    append(view);
  }
});

var template;
var templateFor = function(template) {
  return SC.Handlebars.compile(template);
};

var append = function(view) {
  SC.run(function() {
    view.appendTo('#qunit-fixture');
  });
};

var assertHTML = function(view, expectedHTML) {
  var html = view.$().html();

  // IE 8 (and prior?) adds the \r\n
  html = html.replace(/<script[^>]*><\/script>/ig, '').replace(/[\r\n]/g, '');

  equal(html, expectedHTML);
}

test("it renders the template for each item in an array", function() {
  assertHTML(view, "Steve HoltAnnabelle");
});

test("it updates the view if an item is added", function() {
  SC.run(function() {
    people.pushObject({ name: "Tom Dale" });
  });

  assertHTML(view, "Steve HoltAnnabelleTom Dale");
});

test("it allows you to access the current context using {{this}}", function() {
  view = SC.View.create({
    template: templateFor("{{#each people}}{{this}}{{/each}}"),
    people: SC.A(['Black Francis', 'Joey Santiago', 'Kim Deal', 'David Lovering'])
  });

  append(view);

  assertHTML(view, "Black FrancisJoey SantiagoKim DealDavid Lovering");
});

test("it updates the view if an item is removed", function() {
  SC.run(function() {
    people.removeAt(0);
  });

  assertHTML(view, "Annabelle")
  view.destroy();
});
