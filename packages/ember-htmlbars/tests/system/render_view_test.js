import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import EmberView from 'ember-views/views/view';
import defaultEnv from "ember-htmlbars/env";
import keys from 'ember-metal/keys';

var view;
QUnit.module('ember-htmlbars: renderView', {
  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test('default environment values are passed through', function() {
  var keyNames = keys(defaultEnv);
  expect(keyNames.length);

  view = EmberView.create({
    template: {
      isHTMLBars: true,
      render: function(view, env, contextualElement, blockArguments) {
        for (var i = 0, l = keyNames.length; i < l; i++) {
          var keyName = keyNames[i];

          deepEqual(env[keyName], defaultEnv[keyName], 'passes ' + keyName + ' from the default env');
        }
      }
    }
  });

  runAppend(view);
});
