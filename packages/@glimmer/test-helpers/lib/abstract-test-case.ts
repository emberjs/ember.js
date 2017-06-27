import { TagWrapper } from '../../reference/lib/validators';
import { PathReference, Tagged, RevisionTag, DirtyableTag, Tag } from '@glimmer/reference';
import { Template, RenderResult, RenderOptions } from '@glimmer/runtime';
import {
  TestEnvironment,
  UserHelper
} from './environment';
import { Opaque, dict, expect } from '@glimmer/util';
import { assign, equalTokens, normalizeInnerHTML } from './helpers';
import { Option, Dict } from "@glimmer/interfaces";

export function skip(_target: Object, _name: string, descriptor: PropertyDescriptor) {
  descriptor.value['skip'] = true;
}

export class VersionedObject implements Tagged {
  public tag: TagWrapper<DirtyableTag>;
  public value: Object;

  constructor(value: Object) {
    this.tag = DirtyableTag.create();
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
    this.tag.inner.dirty();
  }
}

export class SimpleRootReference implements PathReference<Opaque> {
  public tag: TagWrapper<RevisionTag>;

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
  public tag: Tag;

  constructor(private parent: PathReference<Opaque>, private key: string) {
    this.tag = parent.tag;
  }

  get(key: string): SimplePathReference {
    return new SimplePathReference(this, key);
  }

  value(): Opaque {
    let parentValue = this.parent.value();
    return parentValue && parentValue[this.key];
  }
}

type IndividualSnapshot = 'up' | 'down' | Node;
type NodesSnapshot = IndividualSnapshot[];

export abstract class RenderTest {
  protected abstract element: HTMLElement;
  protected rawTemplate: string;
  protected serialized: string;
  protected assert = QUnit.assert;
  protected context = dict<Opaque>();
  protected renderResult: Option<RenderResult> = null;
  private snapshot: NodesSnapshot = [];
  private helpers = {};

  constructor(protected env = new TestEnvironment()) {}

  registerHelper(name: string, helper: UserHelper) {
    this.helpers[name] = helper;
  }

  populateHelpers() {
    Object.keys(this.helpers).forEach(name => this.env.registerHelper(name, this.helpers[name]));
  }

  shouldBeVoid(tagName: string) {
    this.element.innerHTML = "";
    let html = "<" + tagName + " data-foo='bar'><p>hello</p>";
    let template = this.compile(html);
    this.renderTemplate(template);

    let tag = '<' + tagName + ' data-foo="bar">';
    let closing = '</' + tagName + '>';
    let extra = "<p>hello</p>";
    html = normalizeInnerHTML(this.element.innerHTML);

    QUnit.assert.pushResult({
      result: (html === tag + extra) || (html === tag + closing + extra),
      actual: html,
      expected: tag + closing + extra,
      message: tagName + " should be a void element"
    });
  }

  protected compile(template: string): Template<Opaque> {
    this.rawTemplate = template;
    return this.env.compile(template);
  }

  render(template: string, properties: Dict<Opaque> = {}): void {
    this.setProperties(properties);

    this.renderResult = this.renderTemplate(this.compile(template));
  }

  protected abstract renderTemplate(template: Template<Opaque>): RenderResult;

  rerender(properties: Dict<Opaque> = {}): void {
    this.setProperties(properties);

    this.env.begin();
    expect(this.renderResult, 'the test should call render() before rerender()').rerender();
    this.env.commit();
  }

  protected set(key: string, value: Opaque): void {
    this.context[key] = value;
  }

  protected setProperties(properties: Dict<Opaque>): void {
    Object.assign(this.context, properties);
  }

  protected takeSnapshot() {
    let snapshot: (Node | 'up' | 'down')[] = this.snapshot = [];

    let node = this.element.firstChild;
    let upped = false;

    while (node && node !== this.element) {
      if (upped) {
        if (node.nextSibling) {
          node = node.nextSibling;
          upped = false;
        } else {
          snapshot.push('up');
          node = node.parentNode;
        }
      } else {
        if (!isServerMarker(node)) snapshot.push(node);

        if (node.firstChild) {
          snapshot.push('down');
          node = node.firstChild;
        } else if (node.nextSibling) {
          node = node.nextSibling;
        } else {
          snapshot.push('up');
          node = node.parentNode;
          upped = true;
        }
      }
    }

    return snapshot;
  }

  protected assertStableRerender() {
    this.takeSnapshot();
    this.runTask(() => this.rerender());
    this.assertStableNodes();
  }

  protected assertHTML(html: string) {
    equalTokens(this.element, html);
  }

  private runTask<T>(callback: () => T): T {
    return callback();
  }

  protected assertStableNodes({ except: _except }: { except: Array<Node> | Node | Node[] } = { except: [] }) {
    let except: Array<Node>;

    if (Array.isArray(_except)) {
      except = uniq(_except);
    } else {
      except = [_except];
    }

    let { oldSnapshot, newSnapshot } = normalize(this.snapshot, this.takeSnapshot(), except);

    if (oldSnapshot.length === newSnapshot.length && oldSnapshot.every((item, index) => item === newSnapshot[index])) {
      return;
    }

    this.assert.deepEqual(oldSnapshot, newSnapshot, "DOM nodes are stable");
  }
}

function normalize(oldSnapshot: NodesSnapshot, newSnapshot: NodesSnapshot, except: Array<Node>) {
  let oldIterator = new SnapshotIterator(oldSnapshot);
  let newIterator = new SnapshotIterator(newSnapshot);

  let normalizedOld = [];
  let normalizedNew = [];

  while (true) {
    let nextOld = oldIterator.peek();
    let nextNew = newIterator.peek();

    if (nextOld === null && newIterator.peek() === null) break;

    if ((nextOld instanceof Node && except.indexOf(nextOld) > -1) || (nextNew instanceof Node && except.indexOf(nextNew) > -1)) {
      oldIterator.skip();
      newIterator.skip();
    } else {
      normalizedOld.push(oldIterator.next());
      normalizedNew.push(newIterator.next());
    }
  }

  return { oldSnapshot: normalizedOld, newSnapshot: normalizedNew };
}

class SnapshotIterator {
  private depth = 0;
  private pos = 0;

  constructor(private snapshot: NodesSnapshot) {
  }

  peek(): Option<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.snapshot[this.pos];
  }

  next(): Option<IndividualSnapshot> {
    if (this.pos >= this.snapshot.length) return null;
    return this.nextNode() || null;
  }

  skip(): void {
    let skipUntil = this.depth;
    this.nextNode();

    if (this.snapshot[this.pos] === 'down') {
      do { this.nextNode(); } while (this.depth !== skipUntil);
    }
  }

  private nextNode(): IndividualSnapshot {
    let token = this.snapshot[this.pos++];

    if (token === 'down') {
      this.depth++;
    } else if (token === 'up') {
      this.depth--;
    }

    return token;
  }
}

function uniq(arr: any[]) {
  return arr.reduce((accum, val) => {
    if (accum.indexOf(val) === -1) accum.push(val);
    return accum;
  }, []);
}

function isServerMarker(node: Node) {
  return node.nodeType === Node.COMMENT_NODE && node.nodeValue!.charAt(0) === '%';
}

export function test(_target: Object, _name: string, descriptor: PropertyDescriptor): PropertyDescriptor | void {
  let testFunction = descriptor.value as Function;
  descriptor.enumerable = true;
  testFunction['isTest'] = true;
}

export function module(name: string, klass: typeof RenderTest & Function): void {
  QUnit.module(`[NEW] ${name}`);

  for (let prop in klass.prototype) {
    const test = klass.prototype[prop];

    if (isTestFunction(test)) {
      QUnit.test(prop, assert => test.call(new klass(), assert));
    }
  }
}

function isTestFunction(value: any): value is (this: RenderTest, assert: typeof QUnit.assert) => void {
  return typeof value === 'function' && value.isTest;
}

export function renderTemplate(env: TestEnvironment, template: Template<Opaque>, options: RenderOptions) {
  env.begin();

  let templateIterator = template.render(options);

  let iteratorResult: IteratorResult<RenderResult>;

  do {
    iteratorResult = templateIterator.next() as IteratorResult<RenderResult>;
  } while (!iteratorResult.done);

  let result = iteratorResult.value;

  env.commit();

  return result;
}
