import run from 'ember-metal/run_loop';
import View from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { set as o_set } from 'ember-metal/property_set';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import TextArea from 'ember-views/views/text_area';
import ComponentLookup from 'ember-views/component_lookup';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';
import isEnabled from 'ember-metal/features';

var textArea, controller, owner;

function set(object, key, value) {
  run(function() { o_set(object, key, value); });
}

function commonSetup() {
  owner = buildOwner();
  owner.register('component:-text-area', TextArea);
  owner.register('component-lookup:main', ComponentLookup);
}

QUnit.module('{{textarea}}', {
  setup() {
    commonSetup();
    controller = {
      val: 'Lorem ipsum dolor'
    };

    textArea = View.extend({
      [OWNER]: owner,
      controller: controller,
      template: compile('{{textarea disabled=disabled value=val}}')
    }).create();

    runAppend(textArea);
  },

  teardown() {
    runDestroy(textArea);
  }
});

QUnit.test('Should insert a textarea', function() {
  equal(textArea.$('textarea').length, 1, 'There is a single textarea');
});

QUnit.test('Should become disabled when the controller changes', function() {
  ok(textArea.$('textarea').is(':not(:disabled)'), 'Nothing is disabled yet');
  set(controller, 'disabled', true);
  ok(textArea.$('textarea').is(':disabled'), 'The disabled attribute is updated');
});

QUnit.test('Should bind its contents to the specified value', function() {
  equal(textArea.$('textarea').val(), 'Lorem ipsum dolor', 'The contents are included');
  set(controller, 'val', 'sit amet');
  equal(textArea.$('textarea').val(), 'sit amet', 'The new contents are included');
});

if (isEnabled('ember-contextual-components')) {
  QUnit.module('{{textarea}} - closure textarea', {
    setup() {
      commonSetup();
    },

    teardown() {
      runDestroy(textArea);
      runDestroy(owner);
    }
  });

  QUnit.test('textarea closure renders a textarea', function() {
    let template = compile(
      `{{#with (hash textarea=(textarea type="text")) as |f|}}
         {{f.textarea}}
       {{/with}}`
    );

    textArea = View.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(textArea);

    equal(textArea.$(`textarea`).length, 1, 'there is one textarea');
  });
}
