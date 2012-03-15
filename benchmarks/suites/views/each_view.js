/*globals App:true Ember before after bench*/

// shut up jshint
var view, newContent;

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
      '    {{#view Em.View contentBinding="this" tagName="tr"}}' +
      "      <td>{{content.id}}</td>" +
      "      <td>{{content.dateIn}}</td>" +
      "      <td>{{content.tag}}</td>" +
      "      <td>{{content.speed}}</td>" +
      "      <td>{{content.length}}</td>" +
      "    {{/view}}" +
      "  {{/each}}" +
      "  </tbody>" +
      "</table>";

  newContent = function() {
    var newContent = [], i;

    for (i = 0; i < 10; i++) {
      newContent[newContent.length] = {
        id: Math.round(Math.random() * 1000),
        dateIn: new Date(),
        tag: "TAG-0" + i,
        speed: Math.random() * 100,
        length: Math.random() * 1000
      };
    }

    return newContent;
  };

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

bench("creating a new view", function() {
  Ember.run(function() {
    App.set('list', newContent());
    view = App.View.create().append();
  });
});

