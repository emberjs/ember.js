import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { Registry } from "ember-runtime/system/container";
import EmberObject from 'ember-runtime/system/object';
import _MetamorphView from 'ember-views/views/metamorph_view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

import { set } from 'ember-metal/property_set';

var view, registry, container;
var trim = jQuery.trim;

QUnit.module('ember-htmlbars: {{#with}} and {{#view}} integration', {
  setup() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
    registry.register('view:default', _MetamorphView);
    registry.register('view:toplevel', EmberView.extend());
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test('View should update when the property used with the #with helper changes [DEPRECATED]', function() {
  registry.register('template:foo', compile('<h1 id="first">{{#with view.content}}{{wham}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the block param form (`{{#with bar as |foo|}}`) instead.');

  equal(view.$('#first').text(), 'bam', 'precond - view renders Handlebars template');

  run(function() {
    set(view, 'content', EmberObject.create({
      wham: 'bazam'
    }));
  });

  equal(view.$('#first').text(), 'bazam', 'view updates when a bound property changes');
});

QUnit.test('should expose a view keyword [DEPRECATED]', function() {
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
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the block param form (`{{#with bar as |foo|}}`) instead.');

  equal(view.$().text(), 'barbang', 'renders values from view and child view');
});

QUnit.test('bindings can be `this`, in which case they *are* the current context [DEPRECATED]', function() {
  view = EmberView.create({
    museumOpen: true,

    museumDetails: EmberObject.create({
      name: 'SFMoMA',
      price: 20,
      museumView: EmberView.extend({
        template: compile('Name: {{view.museum.name}} Price: ${{view.museum.price}}')
      })
    }),


    template: compile('{{#if view.museumOpen}} {{#with view.museumDetails}}{{view museumView museum=this}} {{/with}}{{/if}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the block param form (`{{#with bar as |foo|}}`) instead.');

  equal(trim(view.$().text()), 'Name: SFMoMA Price: $20', 'should print baz twice');
});

QUnit.test('child views can be inserted inside a bind block', function() {
  registry.register('template:nester', compile('<h1 id="hello-world">Hello {{world}}</h1>{{view view.bqView}}'));
  registry.register('template:nested', compile('<div id="child-view">Goodbye {{#with content as |thing|}}{{thing.blah}} {{view view.otherView}}{{/with}} {{world}}</div>'));
  registry.register('template:other', compile('cruel'));

  var context = {
    world: 'world!'
  };

  var OtherView = EmberView.extend({
    container: container,
    templateName: 'other'
  });

  var BQView = EmberView.extend({
    container: container,
    otherView: OtherView,
    tagName: 'blockquote',
    templateName: 'nested'
  });

  view = EmberView.create({
    container: container,
    bqView: BQView,
    context: context,
    templateName: 'nester'
  });

  set(context, 'content', EmberObject.create({
    blah: 'wot'
  }));

  runAppend(view);

  ok(view.$('#hello-world:contains("Hello world!")').length, 'The parent view renders its contents');

  ok(view.$('blockquote').text().match(/Goodbye.*wot.*cruel.*world\!/), 'The child view renders its content once');
  ok(view.$().text().match(/Hello world!.*Goodbye.*wot.*cruel.*world\!/), 'parent view should appear before the child view');
});

QUnit.test('views render their template in the context of the parent view\'s context', function() {
  registry.register('template:parent', compile('<h1>{{#with content as |person|}}{{#view}}{{person.firstName}} {{person.lastName}}{{/view}}{{/with}}</h1>'));

  var context = {
    content: {
      firstName: 'Lana',
      lastName: 'del Heeeyyyyyy'
    }
  };

  view = EmberView.create({
    container: container,
    templateName: 'parent',
    context: context
  });

  runAppend(view);
  equal(view.$('h1').text(), 'Lana del Heeeyyyyyy', 'renders properties from parent context');
});

QUnit.test('views make a view keyword available that allows template to reference view context', function() {
  registry.register('template:parent', compile('<h1>{{#with view.content as |person|}}{{#view person.subview}}{{view.firstName}} {{person.lastName}}{{/view}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'parent',

    content: {
      subview: EmberView.extend({
        firstName: 'Brodele'
      }),
      firstName: 'Lana',
      lastName: 'del Heeeyyyyyy'
    }
  });

  runAppend(view);
  equal(view.$('h1').text(), 'Brodele del Heeeyyyyyy', 'renders properties from parent context');
});
