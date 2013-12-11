/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('Ember.EachView - Create & Append');

var view,
    EachView,
    template =
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

EachView = Ember.View.extend({
  content: newContent(),
  template: Ember.Handlebars.compile(template)
});

suite.on('teardown', function() {
  view.destroy();
});

suite.add('Creating and appending a new view with each', function() {
  Ember.run(function() {
    view = EachView.create().append();
  });
});
