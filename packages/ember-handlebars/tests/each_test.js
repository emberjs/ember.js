var people, view;

module("the #each helper", {
  setup: function() {
    template = templateFor("{{#each people}}{{name}}{{/each}}");
    people = Ember.A([{ name: "Steve Holt" }, { name: "Annabelle" }]);

    view = Ember.View.create({
      template: template,
      people: people
    });

    append(view);
  }
});

var template;
var templateFor = function(template) {
  return Ember.Handlebars.compile(template);
};

var append = function(view) {
  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });
};

var assertHTML = function(view, expectedHTML) {
  var html = view.$().html();

  // IE 8 (and prior?) adds the \r\n
  html = html.replace(/<script[^>]*><\/script>/ig, '').replace(/[\r\n]/g, '');

  equal(html, expectedHTML);
};

test("it renders the template for each item in an array", function() {
  assertHTML(view, "Steve HoltAnnabelle");
});

test("it updates the view if an item is added", function() {
  Ember.run(function() {
    people.pushObject({ name: "Tom Dale" });
  });

  assertHTML(view, "Steve HoltAnnabelleTom Dale");
});

test("it allows you to access the current context using {{this}}", function() {
  view = Ember.View.create({
    template: templateFor("{{#each people}}{{this}}{{/each}}"),
    people: Ember.A(['Black Francis', 'Joey Santiago', 'Kim Deal', 'David Lovering'])
  });

  append(view);

  assertHTML(view, "Black FrancisJoey SantiagoKim DealDavid Lovering");
});

test("it updates the view if an item is removed", function() {
  Ember.run(function() {
    people.removeAt(0);
  });

  assertHTML(view, "Annabelle");
  view.destroy();
});


test("it works inside a ul element", function() {
  view.destroy();

  var ulView = SC.View.create({
    template: templateFor('<ul>{{#each people}}<li>{{name}}</li>{{/each}}</ul>'),
    people: people
  });

  append(ulView);

  equal(ulView.$('li').length, 2, "renders two <li> elements");

  SC.run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(ulView.$('li').length, 3, "renders an additional <li> element when an object is added");
});

test("it works inside a table element", function() {
  view.destroy();

  var tableView = SC.View.create({
    template: templateFor('<table><tbody>{{#each people}}<tr><td>{{name}}</td></tr>{{/each}}</tbody></table>'),
    people: people
  });

  append(tableView);

  equal(tableView.$('td').length, 2, "renders two <td> elements");

  SC.run(function() {
    people.pushObject({name: "Black Francis"});
  });

  equal(tableView.$('td').length, 3, "renders an additional <td> element when an object is added");

  SC.run(function() {
    people.insertAt(0, {name: "Kim Deal"});
  });

  equal(tableView.$('td').length, 4, "renders an additional <td> when an object is inserted at the beginning of the array");
});

