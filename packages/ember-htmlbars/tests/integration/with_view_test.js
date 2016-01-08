import EmberView from 'ember-views/views/view';
import EmberObject from 'ember-runtime/system/object';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

import { set } from 'ember-metal/property_set';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var view, owner, originalViewKeyword;

QUnit.module('ember-htmlbars: {{#with}} and {{#view}} integration', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    owner = buildOwner();
    owner.registerOptionsForType('template', { instantiate: false });
    owner.register('view:toplevel', EmberView.extend());
  },

  teardown() {
    runDestroy(owner);
    runDestroy(view);
    resetKeyword('view', originalViewKeyword);
    owner = view = null;
  }
});

QUnit.test('child views can be inserted inside a bind block', function() {
  owner.register('template:nester', compile('<h1 id="hello-world">Hello {{world}}</h1>{{view view.bqView}}'));
  owner.register('template:nested', compile('<div id="child-view">Goodbye {{#with content as |thing|}}{{thing.blah}} {{view view.otherView}}{{/with}} {{world}}</div>'));
  owner.register('template:other', compile('cruel'));

  var context = {
    world: 'world!'
  };

  var OtherView = EmberView.extend({
    templateName: 'other'
  });

  var BQView = EmberView.extend({
    otherView: OtherView,
    tagName: 'blockquote',
    templateName: 'nested'
  });

  view = EmberView.create({
    [OWNER]: owner,
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
  owner.register('template:parent', compile('<h1>{{#with content as |person|}}{{#view}}{{person.firstName}} {{person.lastName}}{{/view}}{{/with}}</h1>'));

  var context = {
    content: {
      firstName: 'Lana',
      lastName: 'del Heeeyyyyyy'
    }
  };

  view = EmberView.create({
    [OWNER]: owner,
    templateName: 'parent',
    context: context
  });

  runAppend(view);
  equal(view.$('h1').text(), 'Lana del Heeeyyyyyy', 'renders properties from parent context');
});

QUnit.test('views make a view keyword available that allows template to reference view context', function() {
  owner.register('template:parent', compile('<h1>{{#with view.content as |person|}}{{#view person.subview}}{{view.firstName}} {{person.lastName}}{{/view}}{{/with}}</h1>'));

  view = EmberView.create({
    [OWNER]: owner,
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
