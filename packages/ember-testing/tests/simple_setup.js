import { run } from 'ember-metal';
import { jQuery } from 'ember-views';

var App;

QUnit.module('Simple Testing Setup', {
  teardown() {
    if (App) {
      App.removeTestHelpers();
      jQuery('#ember-testing-container, #ember-testing').remove();
      run(App, 'destroy');
      App = null;
    }
  }
});
