import Helper from "ember-htmlbars/system/helper";
import { registerHelper } from "ember-htmlbars/helpers";
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import EmberObject from 'ember-runtime/system/object';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import { set } from 'ember-metal/property_set';
import { isStream } from 'ember-metal/streams/utils';

var view;

QUnit.module('ember-htmlbars: streams', {
  teardown() {
    runDestroy(view);
    view = null;
  }
});

QUnit.test("Unbound helpers should have access to streams when being called directly and when being called in a subexpression", function() {
  registerHelper('get-content', new Helper(function(params, hash, templates, env, scope) {
    var param = params[0];
    var ret;
    if (isStream(param)) {
      ret = env.hooks.getChild(param, 'content');
      ret.subscribe(param.notify, param);
      return env.hooks.getValue(ret);
    }
  }));

  var controller = EmberObject.create();

  view = EmberView.create({
    controller: controller,
    template: compile('{{get-content objWithContent1}} {{if true (get-content objWithContent2)}}')
  });

  controller.setProperties({
    objWithContent1: EmberObject.create({ content: 'foo' }),
    objWithContent2: EmberObject.create({ content: 'foo' })
  });

  runAppend(view);

  equal(view.$().text(), "foo foo");
  run(function() {
    set(controller, 'objWithContent1.content', 'bar');
    set(controller, 'objWithContent2.content', 'bar');
  });
  equal(view.$().text(), "bar bar");

});
