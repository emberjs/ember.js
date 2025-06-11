import Ember from 'ember';

function testListener() {
  class TestListener extends Ember.Component {
    init() {
      Ember.addListener(this, 'willDestroyElement', this, 'willDestroyListener');
      Ember.addListener(this, 'willDestroyElement', this, 'willDestroyListener', true);
      Ember.addListener(this, 'willDestroyElement', this, this.willDestroyListener);
      Ember.addListener(this, 'willDestroyElement', this, this.willDestroyListener, true);
      Ember.removeListener(this, 'willDestroyElement', this, 'willDestroyListener');
      Ember.removeListener(this, 'willDestroyElement', this, this.willDestroyListener);
    }
    willDestroyListener() {}
  }
}
