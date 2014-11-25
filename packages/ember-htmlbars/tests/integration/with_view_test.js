import run from 'ember-metal/run_loop';
import Ember from 'ember-metal/core';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import Container from 'ember-runtime/system/container';
import EmberObject from 'ember-runtime/system/object';
import _MetamorphView from 'ember-views/views/metamorph_view';
import EmberHandlebars from 'ember-handlebars';
import htmlbarsCompile from 'ember-htmlbars/system/compile';

import { set } from 'ember-metal/property_set';

var view, container;

var trim = jQuery.trim;

var appendView = function(view) {
  run(view, 'appendTo', '#qunit-fixture');
};

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

QUnit.module('ember-htmlbars: {{#with}} and {{#view}} integration', {
  setup: function() {
    container = new Container();
    container.optionsForType('template', { instantiate: false });
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },

  teardown: function() {
    run(function() {
      if (container) {
        container.destroy();
      }

      if (view) {
        view.destroy();
      }

      container = view = null;
    });
  }
});

test('View should update when the property used with the #with helper changes [DEPRECATED]', function() {
  container.register('template:foo', compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  expectDeprecation(function() {
    appendView(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$('#first').text(), 'bam', 'precond - view renders Handlebars template');

  run(function() {
    set(view, 'content', EmberObject.create({
      wham: 'bazam'
    }));
  });

  equal(view.$('#first').text(), 'bazam', 'view updates when a bound property changes');
});

test('should expose a view keyword [DEPRECATED]', function() {
  var templateString = '{{#with view.differentContent}}{{view.foo}}{{#view baz="bang"}}{{view.baz}}{{/view}}{{/with}}';
  view = EmberView.create({
    container: container,
    differentContent: {
      view: {
        foo: 'WRONG',
        baz: 'WRONG'
      }
    },

    foo: 'bar',

    template: compile(templateString)
  });

  expectDeprecation(function() {
    appendView(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(view.$().text(), 'barbang', 'renders values from view and child view');
});

test('bindings can be `this`, in which case they *are* the current context [DEPRECATED]', function() {
  view = EmberView.create({
    museumOpen: true,

    museumDetails: EmberObject.create({
      name: 'SFMoMA',
      price: 20,
      museumView: EmberView.extend({
        template: compile('Name: {{view.museum.name}} Price: ${{view.museum.price}}')
      })
    }),


    template: EmberHandlebars.compile('{{#if view.museumOpen}} {{#with view.museumDetails}}{{view museumView museum=this}} {{/with}}{{/if}}')
  });

  expectDeprecation(function() {
    appendView(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.');

  equal(trim(view.$().text()), 'Name: SFMoMA Price: $20', 'should print baz twice');
});
