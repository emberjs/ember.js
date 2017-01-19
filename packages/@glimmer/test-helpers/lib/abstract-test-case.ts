import { PathReference, Tagged, Revision, RevisionTag, DirtyableTag } from '@glimmer/reference';
import { Template, RenderResult, Simple } from '@glimmer/runtime';
import {
  TestEnvironment,
  TestDynamicScope
} from './environment';
import { Opaque } from '@glimmer/util';
import { assign } from './helpers';

export function skip(target: Object, name: string, descriptor: PropertyDescriptor) {
  descriptor.value['skip'] = true;
}

export class VersionedObject implements Tagged<Revision> {
  public tag: DirtyableTag;
  public value: Object;

  constructor(value: Object) {
    this.tag = new DirtyableTag();
    assign(this, value);
  }

  update(value: Object) {
    assign(this, value);
    this.dirty();
  }

  set(key: string, value: Opaque) {
    this[key] = value;
    this.dirty();
  }

  dirty() {
    this.tag.dirty();
  }
}

export class SimpleRootReference implements PathReference<Opaque> {
  public tag: RevisionTag;

  constructor(private object: VersionedObject) {
    this.tag = object.tag;
  }

  get(key: string): PathReference<Opaque> {
    return new SimplePathReference(this, key);
  }

  value(): Object {
    return this.object;
  }
}

class SimplePathReference implements PathReference<Opaque> {
  public tag: RevisionTag;

  constructor(private parent: PathReference<Opaque>, private key: string) {
    this.tag = parent.tag;
  }

  get(key: string): SimplePathReference {
    return new SimplePathReference(this, key);
  }

  value() {
    return this.parent.value()[this.key];
  }
}

function isMarker(node) {
  if (node instanceof Comment && node.textContent === '') {
    return true;
  }

  if (node instanceof Text && node.textContent === '') {
    return true;
  }

  return false;
}

export class RenderingTest {
  public template: Template<{}>;
  protected context: VersionedObject = null;
  private result: RenderResult = null;
  public snapshot: Element[];
  public element: Node;
  public assert: typeof QUnit.assert;

  constructor(protected env: TestEnvironment = new TestEnvironment(), template: string, private appendTo: Simple.Element) {
    this.template = this.env.compile(template);
    this.assert = QUnit.config.current.assert;
  }

  teardown() {}

  render(context: Object) {
    this.env.begin();
    let dynamicScope = new TestDynamicScope();
    let appendTo = this.appendTo;
    let rootObject = new VersionedObject(context);
    let root = new SimpleRootReference(rootObject);

    this.context = rootObject;
    this.result = this.template.render(root, appendTo, dynamicScope);
    this.env.commit();
    this.element = document.getElementById('qunit-fixture').firstChild;
  }
  assertContent(expected: string, message?: string) {
    let actual = document.getElementById('qunit-fixture').innerHTML;
    QUnit.assert.equal(actual, expected);
  }

  takeSnapshot() {
    let snapshot = this.snapshot = [];
    let node = this.element.firstChild;

    while (node) {
      if (!isMarker(node)) {
        snapshot.push(node);
      }

      node = node.nextSibling;
    }

    return snapshot;
  }

  assertStableRerender() {
    this.takeSnapshot();
    this.rerender();
    this.assertInvariants();
  }

  rerender() {
    this.result.rerender();
  }

  assertInvariants(oldSnapshot?: Array<Node>, newSnapshot?: Array<Node>) {
    oldSnapshot = oldSnapshot || this.snapshot;
    newSnapshot = newSnapshot || this.takeSnapshot();

    this.assert.strictEqual(newSnapshot.length, oldSnapshot.length, 'Same number of nodes');

    for (let i = 0; i < oldSnapshot.length; i++) {
      this.assertSameNode(newSnapshot[i], oldSnapshot[i]);
    }
  }

  assertSameNode(actual: Node, expected: Node) {
    this.assert.strictEqual(actual, expected, 'DOM node stability');
  }

  runTask(callback: () => void) {
    callback();
    this.env.begin();
    this.result.rerender();
    this.env.commit();
  }
}

export function testModule(description?: string) {
  return function(TestClass: typeof RenderingTest) {
    let context: RenderingTest;

    QUnit.module(`[Browser] ${description || TestClass.name}`, {
      afterEach() {
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

export function template(t: string) {
  return function template(target: Object, name: string, descriptor: PropertyDescriptor) {
    if (typeof descriptor.value !== 'function') {
      throw new Error("Can't decorator a non-function with the @template decorator");
    }

    descriptor.value['template'] = t;
  };
}
