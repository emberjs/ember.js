import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { Binding } from 'ember-metal/binding';
import EmberObject from 'ember-runtime/system/object';
import { computed } from 'ember-metal/computed';
import htmlbarsCompile from 'ember-htmlbars/system/compile';
import EmberHandlebars from "ember-handlebars";
import { ViewHelper as handlebarsViewHelper } from 'ember-handlebars/helpers/view';
import { ViewHelper as htmlbarsViewHelper } from 'ember-htmlbars/helpers/view';

var compile, view;

var trim = jQuery.trim;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var appendView = function(view) {
  run(view, 'appendTo', '#qunit-fixture');
};

QUnit.module('ember-htmlbars: binding integration', {
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
      view = null;
    });
  }
});

test('should call a registered helper for mustache without parameters', function() {
  EmberHandlebars.registerHelper('foobar', function() {
    return 'foobar';
  });

  view = EmberView.create({
    template: compile('{{foobar}}')
  });

  appendView(view);

  ok(view.$().text() === 'foobar', 'Regular helper was invoked correctly');
});

test('should bind to the property if no registered helper found for a mustache without parameters', function() {
  view = EmberView.createWithMixins({
    template: compile('{{view.foobarProperty}}'),
    foobarProperty: computed(function() {
      return 'foobarProperty';
    })
  });

  appendView(view);

  ok(view.$().text() === 'foobarProperty', 'Property was bound to correctly');
});

test('should accept bindings as a string or an Ember.Binding', function() {
  var viewClass = EmberView.extend({
    template: compile('binding: {{view.bindingTest}}, string: {{view.stringTest}}')
  });

  EmberHandlebars.registerHelper('boogie', function(id, options) {
    options.hash = options.hash || {};
    options.hashTypes = options.hashTypes || {};

    options.hash.bindingTestBinding = Binding.oneWay('context.' + id);
    options.hash.stringTestBinding = id;

    var result;
    if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
      result = htmlbarsViewHelper.helper(viewClass, options.hash, options, options);
    } else {
      result = handlebarsViewHelper.helper(this, viewClass, options);
    }

    return result;
  });

  view = EmberView.create({
    context: EmberObject.create({
      direction: 'down'
    }),
    template: compile('{{boogie direction}}')
  });

  appendView(view);

  equal(trim(view.$().text()), 'binding: down, string: down');
});
