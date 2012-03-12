/*globals App:true Ember before after bench*/

var view;

before(function() {
  Ember.run(function() {
    view = Ember.ContainerView.create({
      childViews: [ 'one', 'two', 'three' ],

      one: Ember.View,
      two: Ember.View,
      three: Ember.View
    }).append();
  });
});

bench("creating a new view", function() {
  Ember.run(function() {
    view.destroy();
  });
});

