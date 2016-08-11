import { TestEnvironment, SimpleRootReference, VersionedObject } from "glimmer-test-helpers";
import { Template, DynamicScope, RenderResult } from 'glimmer-runtime';

const TEST_DYNAMIC_SCOPE: DynamicScope = {
  child(): DynamicScope {
    return TEST_DYNAMIC_SCOPE;
  }
};

// TODO: Make DOMChanges and Glimmer understand the interface we actually need here
type SimpleNode = Element;

class RenderingTest {
  public template: Template;
  protected context: VersionedObject = null;
  protected env: TestEnvironment;
  private result: RenderResult = null;
  public snapShot: Element[];
  public element: Element;

  constructor(env: TestEnvironment, template: string, private appendTo: SimpleNode) {
    this.env = new TestEnvironment();
    this.template = this.env.compile(template);
  }

  teardown() {}

  render(context: Object) {
    let dynamicScope = TEST_DYNAMIC_SCOPE;
    let appendTo = this.appendTo;
    let rootObject = new VersionedObject(context);
    let root = new SimpleRootReference(rootObject);

    this.context = rootObject;
    this.result = this.template.render(root, this.env, { dynamicScope, appendTo });
  }
  assertContent(expected: string, message?: string) {
    let actual = document.getElementById('qunit-fixture').innerHTML;
    QUnit.equal(actual, expected);
  }

  takeSnapShot() {
    // let snapshot = this.snapshot = [];

    // let node = this.element.firstChild;

    // while (node) {
    //   if (!isMarker(node)) {
    //     snapshot.push(node);
    //   }

    //   node = node.nextSibling;
    // }

    // return snapshot;
  }

  assertStableRerender() {
    this.takeSnapShot();
  }

  assertInvariants() {}

  runTask(callback: () => void) {
    callback();
    this.result.rerender();
  }
}

interface Constructor<T> {
  new(...args): T;
}

function testModule(description?: string) {
  return function(TestClass: typeof RenderingTest) {
    let context: RenderingTest;

    QUnit.module(`[Browser] ${description || TestClass.name}`, {
      teardown() {
        context.teardown();
      }
    });

    let keys = Object.getOwnPropertyNames(TestClass.prototype);
    keys.forEach(key => {
      if (key === 'constructor') return;
      let value = Object.getOwnPropertyDescriptor(TestClass.prototype, key).value;
      let isSkipped = value.skip;
      if (typeof value === 'function' && !isSkipped) {
        QUnit.test(key, (assert) => {
          let env = new TestEnvironment();
          context = new TestClass(env, value['template'], document.getElementById('qunit-fixture'));
          value.call(context, assert);
        });
      } else if (isSkipped) {
        QUnit.skip(key, () => {});
      }
    });
  };
}

function template(t: string) {
  return function template(target: Object, name: string, descriptor: PropertyDescriptor) {
    if (typeof descriptor.value !== 'function') {
      throw new Error("Can't decorator a non-function with the @template decorator");
    }

    descriptor.value['template'] = t;
  };
}

@testModule('Content Tests')
class ContentTests extends RenderingTest {
  protected context: VersionedObject;

  @template(`<div><p>{{value}}</p></div>`)
  ['renders simple curly'](assert) {
    this.render({ value: 'hello world' });
    this.assertContent('<div><p>hello world</p></div>');
    this.assertStableRerender();

    this.runTask(() => this.context.set('value', "goodbye world"));
    this.assertContent('<div><p>goodbye world</p></div>');
    this.assertInvariants();

    this.runTask(() => this.context.update({ value: 'hello world'}));
    this.assertContent('<div><p>hello world</p></div>');
    this.assertInvariants();
  }

  @template(`<div><p>{{value}} world</p></div>`)
  ['renders simple curly with sibling'](assert) {
    this.render({ value: 'hello' });
    this.assertContent('<div><p>hello world</p></div>');
    this.assertStableRerender();

    this.runTask(() => this.context.set('value', "goodbye"));
    this.assertContent('<div><p>goodbye world</p></div>');
    this.assertInvariants();

    this.runTask(() => this.context.update({ value: 'hello' }));
    this.assertContent('<div><p>hello world</p></div>');
    this.assertInvariants();
  }

  @template(`<div><p>{{v1}}</p><p>{{v2}}</p></div>`)
  ['null and undefined produces empty text nodes'](assert) {
    this.render({ v1: null, v2: undefined });
    this.assertContent('<div><p></p><p></p></div>');
    this.assertStableRerender();

    this.runTask(() => {
      this.context.set('v1', "hello");
      this.context.set('v2', "world");
    });
    this.assertContent('<div><p>hello</p><p>world</p></div>');
    this.assertInvariants();

    this.runTask(() => {
      this.context.update({ v1: null, v2: undefined });
    });
    this.assertContent('<div><p></p><p></p></div>');
    this.assertInvariants();
  }

  @template(`<div>{{{value}}}</div>`)
  ['updating a single trusting curly']() {
    this.render({ value: '<p>hello world</p>' });

    this.assertStableRerender();

    this.assertContent('<div><p>hello world</p></div>');

    this.runTask(() => this.context.set('value', '<h1>WORD</h1>' ));

    this.assertContent('<div><h1>WORD</h1></div>');

    this.runTask(() => this.context.update({ value: '<p>hello world</p>' }));

    this.assertContent('<div><p>hello world</p></div>');
  }
}
