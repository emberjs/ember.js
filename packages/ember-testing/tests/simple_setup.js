import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';

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
