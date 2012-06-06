require("ember-data/core");
require("ember-data/system/adapters");

var get = Ember.get;

DS.FixtureAdapter = DS.Adapter.extend({

  simulateRemoteResponse: true,

  latency: 50,

  /*
    Implement this method in order to provide data associated with a type
  */
  fixturesForType: function(type) {
    return type.FIXTURES ? Ember.A(type.FIXTURES) : null;
  },

  /*
    Implement this method in order to query fixtures data
  */
  queryFixtures: function(fixtures, query) {
    return fixtures;
  },

  /*
    Implement this method in order to provide provide json for CRUD methods
  */
  mockJSON: function(type, record) {
    return record.toJSON({associations: true});
  },

  /*
    Adapter methods
  */
  generateIdForRecord: function(store, record) {
    return Ember.guidFor(record);
  },

  find: function(store, type, id) {
    var fixtures = this.fixturesForType(type);

    if (fixtures) {
      fixtures = fixtures.findProperty('id', id);
    }

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    this.simulateRemoteCall(function() {
      store.load(type, fixtures);
    }, store, type);
  },

  findMany: function(store, type, ids) {
    var fixtures = this.fixturesForType(type);

    if (fixtures) {
      fixtures = fixtures.filter(function(item) {
        return ids.indexOf(item.id) !== -1;
      });
    }

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    this.simulateRemoteCall(function() {
      store.loadMany(type, fixtures);
    }, store, type);
  },

  findAll: function(store, type) {
    var fixtures = this.fixturesForType(type);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    this.simulateRemoteCall(function() {
      store.loadMany(type, fixtures);
    }, store, type);
  },

  findQuery: function(store, type, query, array) {
    var fixtures = this.fixturesForType(type);

    fixtures = this.queryFixtures(fixtures, query);

    Ember.assert("Unable to find fixtures for model type "+type.toString(), !!fixtures);

    this.simulateRemoteCall(function() {
      array.load(fixtures);
    }, store, type);
  },

  createRecord: function(store, type, record) {
    var fixture = this.mockJSON(type, record);

    fixture.id = this.generateIdForRecord(store, record);

    this.simulateRemoteCall(function() {
      store.didCreateRecord(record, fixture);
    }, store, type, record);
  },

  updateRecord: function(store, type, record) {
    var fixture = this.mockJSON(type, record);

    this.simulateRemoteCall(function() {
      store.didUpdateRecord(record, fixture);
    }, store, type, record);
  },

  deleteRecord: function(store, type, record) {
    this.simulateRemoteCall(function() {
      store.didDeleteRecord(record);
    }, store, type, record);
  },

  /*
    @private
  */
  simulateRemoteCall: function(callback, store, type, record) {
    if (get(this, 'simulateRemoteResponse')) {
      setTimeout(callback, get(this, 'latency'));
    } else {
      callback();
    }
  }
});

DS.fixtureAdapter = DS.FixtureAdapter.create();
