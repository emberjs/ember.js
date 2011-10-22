var people, view;

module("the #each helper", {
  setup: function() {
    template = templateFor("{{#each people}}{{name}}{{/each}}");
    people = SC.Array.apply([{ name: "Steve Holt" }, { name: "Annabelle" }]);

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
  html = html.replace(/<script[^>]*><\/script>/ig, '');

  equal(expectedHTML, html);
}

test("it renders the template for each item in an array", function() {
  assertHTML(view, "Steve HoltAnnabelle");
});

test("it updates the view if an item is added", function() {
  SC.run(function() {
    people.pushObject({ name: "Tom Dale" });
  });

  assertHTML(view, "Steve HoltAnnabelleTom Dale")
});
