import Ember from 'ember';
import { set } from '@ember/object';

class MyController extends Ember.Controller {
  queryParams = ['category'];
  category = null;
  isExpanded = false;

  toggleBody() {
    set(this, 'isExpanded', !this.isExpanded);
  }
}
