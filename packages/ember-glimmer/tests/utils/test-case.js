import packageName from './package-name';
import Environment from './environment';
import { compile, DOMHelper, Renderer } from './helpers';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import Component from 'ember-views/components/component';
import jQuery from 'ember-views/system/jquery';

const packageTag = `${packageName.toUpperCase()}: `;

export function moduleFor(description, TestClass) {
  let context;

  QUnit.module(description, {
    setup() {
      context = new TestClass();
    },

    teardown() {
      context.teardown();
    }
  });

  Object.keys(TestClass.prototype).forEach(name => {
    if (name.indexOf('TEST: ') === 0) {
      QUnit.test(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf('SKIP: ') === 0) {
      QUnit.skip(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf(packageTag) === 0) {
      QUnit.test(name.slice(packageTag.length), assert => context[name](assert));
    }
  });
}

let assert = QUnit.assert;

export class TestCase {
  teardown() {}
}

export class RenderingTest extends TestCase {
  constructor() {
    super();
    let dom = new DOMHelper(document);
    let env = this.env = new Environment(dom);
    this.renderer = new Renderer(dom, { destinedForDOM: true, env });
    this.component = null;
  }

  teardown() {
    if (this.component) {
      runDestroy(this.component);
    }
  }

  render(templateStr, context = {}) {
    let { env, renderer } = this;

    let attrs = Object.assign({}, context, {
      renderer,
      template: compile(templateStr, { env })
    });

    this.component = Component.create(attrs);

    runAppend(this.component);
  }

  rerender() {
    this.component.rerender();
  }

  assertText(text) {
    assert.strictEqual(jQuery('#qunit-fixture').text(), text, `#qunit-fixture contents`);
  }
}
