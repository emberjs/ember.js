import Ember from 'ember';

class MyController extends Ember.Controller {
  queryParams = ['category'];
  category = null;
  isExpanded = false;

  toggleBody() {
    this.toggleProperty('isExpanded');
  }
}
