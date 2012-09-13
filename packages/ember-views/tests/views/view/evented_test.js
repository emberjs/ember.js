var set = Ember.set, get = Ember.get;

module("Ember.View evented helpers");

test("fire should call method sharing event name if it exists on the view", function() {
  var eventFired = false;

  var view = Ember.View.create({
    fireMyEvent: function() {
      this.trigger('myEvent');
    },

    myEvent: function() {
      eventFired = true;
    }
  });

  Ember.run(function() {
    view.fireMyEvent();
  });

  equal(eventFired, true, "fired the view method sharing the event name");
});

test("fire does not require a view method with the same name", function() {
  var eventFired = false;

  var view = Ember.View.create({
    fireMyEvent: function() {
      this.trigger('myEvent');
    }
  });

  var listenObject = Ember.Object.create({
    onMyEvent: function() {
      eventFired = true;
    }
  });

  view.on('myEvent', listenObject, 'onMyEvent');

  Ember.run(function() {
    view.fireMyEvent();
  });

  equal(eventFired, true, "fired the event without a view method sharing its name");
});

