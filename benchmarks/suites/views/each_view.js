/*globals App:true Ember before after bench*/

// shut up jshint
var view;

before(function() {
  var view;
  window.App = Ember.Namespace.create();

  var template =
      "<table>" +
      "  <thead>" +
      "  <th>ID</th>" +
      "  <th>Date</th>" +
      "  <th>Tag</th>" +
      "  <th>Speed</th>" +
      "  <th>Length</th>" +
      "  </thead>" +
      "  <tbody>" +
      "  {{#each App.list}}" +
      '    {{#view Em.View tagName="tr"}}' +
      "      <td>{{id}}</td>" +
      "      <td>{{dateIn}}</td>" +
      "      <td>{{tag}}</td>" +
      "      <td>{{speed}}</td>" +
      "      <td>{{length}}</td>" +
      "    {{/view}}" +
      "  {{/each}}" +
      "  </tbody>" +
      "</table>";

  function newContent() {
    var content = [], i;
    for (i = 0; i < 10; i++) {
      content.push({
        id: Math.round(Math.random() * 1000),
        dateIn: new Date(),
        tag: "TAG-0" + i,
        speed: Math.random() * 100,
        length: Math.random() * 1000
      });
    }
    return content;
  }

  App.list = newContent();

  App.View = Ember.View.extend({
    template: Ember.Handlebars.compile(template)
  });

  Ember.run(function() {
    view = App.View.create().append();
  });
});

after(function() {
  view.destroy();
});

bench("creating and appending a new view with each", function() {
  Ember.run(function() {
    view = App.View.create().append();
  });
});

