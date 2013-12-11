/* global window */
var benchmarkApp = Ember.Application.create(),
    Benchmark    = Ember.Object.extend({
                     name: null,
                     info: null,
                     infoString: null
                   });

Ember.Handlebars.helper('number', function(hz) {
  if (hz) {
    hz = hz.toString();
    hz = hz.toString().substring(0, hz.indexOf('.'));
    hz = hz.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return hz;
});

function getSuiteObject(data) {
  var benchmark = Benchmark.create({ info: data.info, infoString: data.infoString }),
      benchmarks = Ember.A([benchmark]);

  return Ember.Object.create({
    name: data.name,
    version: data.version,
    benchmarks: benchmarks
  });
}

benchmarkApp.IndexController = Ember.ObjectController.extend({
  suites: Ember.A(),
  libNames: Ember.A(),
  name: null,
  duration: 0,
  sortedByHerz: function() {
    return this.get('benchmarks').sortBy('info.hz');
  }.property('benchmarks.@each.[]')
});

var indexController = benchmarkApp.__container__.lookup('controller:index'),
    benchmarks = {};

window.addEventListener('message', function(event) {
  if (event.origin === 'http://localhost:8000') {
    var data  = JSON.parse(event.data),
        suites = indexController.get('suites'),
        suite = getSuiteObject(data);

    if (!suites.mapBy('name').contains(suite.name)) {
      indexController.get('suites').pushObject(suite);
    } else {
      indexController.get('suites').filterBy('name', suite.name)[0].get('benchmarks').pushObject(suite.get('benchmarks.firstObject'));
    }

    if (!indexController.get('libNames').contains(data.version)) {
      indexController.get('libNames').pushObject(data.version);
    }

    var duration = indexController.get('duration') || 0;
    indexController.get('suites').filterBy('name', suite.name)[0].get('benchmarks').map(function(e) {
      return indexController.set('duration', (duration + e.info.times.elapsed) / 3);
    });
  }
}, false);

export default benchmarkApp;
