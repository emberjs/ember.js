import { Opaque, Option, Dict } from "@glimmer/interfaces";
import { Template, RenderResult, RenderOptions, IteratorResult } from "@glimmer/runtime";
import { TestEnvironment, equalTokens, TestDynamicScope } from "@glimmer/test-helpers";
import { UpdatableReference } from "@glimmer/object-reference";
import { expect, dict } from "@glimmer/util";

type IndividualSnapshot = 'up' | 'down' | Node;
type NodesSnapshot = IndividualSnapshot[];

abstract class RenderTest {
  protected abstract element: HTMLElement;

  protected assert = QUnit.assert;
  protected context = dict<Opaque>();
  protected renderResult: Option<RenderResult> = null;
  private snapshot: NodesSnapshot = [];

  constructor(protected env = new TestEnvironment()) {}

  @test "HTML text content"() {
    this.render("content");
    this.assertHTML("content");
    this.assertStableRerender();
  }

  @test "HTML tags"() {
    this.render("<h1>hello!</h1><div>content</div>");
    this.assertHTML("<h1>hello!</h1><div>content</div>");
    this.assertStableRerender();
  }

  @test "HTML attributes"() {
    this.render("<div class='foo' id='bar'>content</div>");
    this.assertHTML("<div class='foo' id='bar'>content</div>");
    this.assertStableRerender();
  }

  @test "HTML tag with empty attribute"() {
    this.render("<div class=''>content</div>");
    this.assertHTML("<div class=''>content</div>");
    this.assertStableRerender();
  }

  @test "HTML boolean attribute 'disabled'"(assert: typeof QUnit.assert) {
    this.render('<input disabled>');
    this.assertHTML("<input disabled>");

    // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
    // assertNodeProperty(root.firstChild, 'input', 'disabled', true);

    this.assertStableRerender();
  }

  @test "Quoted attribute null values do not disable"() {
    this.render('<input disabled="{{isDisabled}}">', { isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableRerender();

    // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
    // assertNodeProperty(root.firstChild, 'input', 'disabled', false);

    this.rerender({ isDisabled: true });
    this.assertHTML('<input disabled>');
    this.assertStableNodes();

    // TODO: ??????????
    this.rerender({ isDisabled: false });
    this.assertHTML('<input disabled>');
    this.assertStableNodes();

    this.rerender({ isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableNodes();
  }

  @test "Unquoted attribute null values do not disable"() {
    this.render('<input disabled={{isDisabled}}>', { isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableRerender();

    // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
    // assertNodeProperty(root.firstChild, 'input', 'disabled', false);

    this.rerender({ isDisabled: true });
    this.assertHTML('<input disabled>');
    this.assertStableRerender();

    this.rerender({ isDisabled: false });
    this.assertHTML('<input>');
    this.assertStableRerender();

    this.rerender({ isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableRerender();
  }

  @test "Quoted attribute string values"() {
    this.render("<img src='{{src}}'>", { src: 'image.png' });
    this.assertHTML("<img src='image.png'>");
    this.assertStableRerender();

    this.rerender({ src: 'newimage.png' });
    this.assertHTML("<img src='newimage.png'>");
    this.assertStableNodes();

    this.rerender({ src: '' });
    this.assertHTML("<img src=''>");
    this.assertStableNodes();

    this.rerender({ src: 'image.png' });
    this.assertHTML("<img src='image.png'>");
    this.assertStableNodes();
  }

  @test "HTML comments"() {
    this.render('<div><!-- Just passing through --></div>');
    this.assertHTML('<div><!-- Just passing through --></div>');
    this.assertStableRerender();
  }

  @test "HTML comments with multi-line mustaches"() {
    this.render('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
    this.assertHTML('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
    this.assertStableRerender();
  }

  @test "Text curlies"() {
    this.render('<div>{{title}}<span>{{title}}</span></div>', { title: 'hello' });
    this.assertHTML('<div>hello<span>hello</span></div>');
    this.assertStableRerender();

    this.rerender({ title: 'goodbye' });
    this.assertHTML('<div>goodbye<span>goodbye</span></div>');
    this.assertStableNodes();

    this.rerender({ title: '' });
    this.assertHTML('<div><span></span></div>');
    this.assertStableNodes();

    this.rerender({ title: 'hello' });
    this.assertHTML('<div>hello<span>hello</span></div>');
    this.assertStableNodes();
  }

  @test "Node curlies"() {
    let title = document.createElement('span');
    title.innerText = 'hello';
    this.render('<div>{{title}}</div>', { title });
    this.assertHTML('<div><span>hello</span></div>');
    this.assertStableRerender();

    let title2 = document.createElement('span');
    title2.innerText = 'goodbye';
    this.rerender({ title: title2 });
    this.assertHTML('<div><span>goodbye</span></div>');
    this.assertStableNodes({ except: title });

    let title3 = document.createTextNode('');
    this.rerender({ title: title3 });
    this.assertHTML('<div></div>');
    this.assertStableNodes({ except: title2 });

    this.rerender({ title });
    this.assertHTML('<div><span>hello</span></div>');
    this.assertStableNodes({ except: title3 });
  }

  @test "Safe HTML curlies"() {
    let title = { toHTML() { return '<span>hello</span> <em>world</em>'; } };
    this.render('<div>{{title}}</div>', { title });
    this.assertHTML('<div><span>hello</span> <em>world</em></div>');
    this.assertStableRerender();
  }

  @test "Triple curlies"() {
    let title = '<span>hello</span> <em>world</em>';
    this.render('<div>{{{title}}}</div>', { title });
    this.assertHTML('<div><span>hello</span> <em>world</em></div>');
    this.assertStableRerender();
  }

  @test "Simple blocks"() {
    this.render('<div>{{#if admin}}<p>{{user}}</p>{{/if}}!</div>', { admin: true, user: 'chancancode' });
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableRerender();

    let p = this.element.firstChild!.firstChild!;

    this.rerender({ admin: false });
    this.assertHTML('<div><!---->!</div>');
    this.assertStableNodes({ except: p });

    let comment = this.element.firstChild!.firstChild!;

    this.rerender({ admin: true });
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableNodes({ except: comment });
  }

  @test "Nested blocks"() {
    this.render('<div>{{#if admin}}{{#if access}}<p>{{user}}</p>{{/if}}{{/if}}!</div>', { admin: true, access: true, user: 'chancancode' });
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableRerender();

    let p = this.element.firstChild!.firstChild!;

    this.rerender({ admin: false });
    this.assertHTML('<div><!---->!</div>');
    this.assertStableNodes({ except: p });

    let comment = this.element.firstChild!.firstChild!;

    this.rerender({ admin: true });
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableNodes({ except: comment });

    p = this.element.firstChild!.firstChild!;

    this.rerender({ access: false });
    this.assertHTML('<div><!---->!</div>');
    this.assertStableNodes({ except: p });
  }

  @test "Loops"() {
    this.render('<div>{{#each people key="handle" as |p|}}<span>{{p.handle}}</span> - {{p.name}}{{/each}}</div>', {
      people: [
        { handle: 'tomdale', name: 'Tom Dale' },
        { handle: 'chancancode', name: 'Godfrey Chan' },
        { handle: 'wycats', name: 'Yehuda Katz' }
      ]
    });

    this.assertHTML('<div><span>tomdale</span> - Tom Dale<span>chancancode</span> - Godfrey Chan<span>wycats</span> - Yehuda Katz</div>');
    this.assertStableRerender();

    this.rerender({
      people: [
        { handle: 'tomdale', name: 'Thomas Dale' },
        { handle: 'wycats', name: 'Yehuda Katz' }
      ]
    });

    this.assertHTML('<div><span>tomdale</span> - Thomas Dale<span>wycats</span> - Yehuda Katz</div>');
  }

  protected compile(template: string): Template<Opaque> {
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

  private takeSnapshot() {
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
        snapshot.push(node);

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

  protected assertStableNodes({ except: _except }: { except: Set<Node> | Node | Node[] } = { except: new Set() }) {
    let except: Set<Node>;

    if (Array.isArray(_except)) {
      except = new Set(_except);
    } else if (_except instanceof Set) {
      except = _except;
    } else {
      except = new Set([_except]);
    }

    let { oldSnapshot, newSnapshot } = normalize(this.snapshot, this.takeSnapshot(), except);

    if (oldSnapshot.length === newSnapshot.length && oldSnapshot.every((item, index) => item === newSnapshot[index])) {
      return;
    }

    this.assert.deepEqual(oldSnapshot, newSnapshot, "DOM nodes are stable");
  }
}

module("Initial Render Tests", class extends RenderTest {
  protected element: HTMLDivElement;

  constructor(env = new TestEnvironment()) {
    super(env);
    this.element = env.getDOM().createElement('div') as HTMLDivElement;
  }

  renderTemplate(template: Template<Opaque>): RenderResult {
    return renderTemplate(this.env, template, {
      self: new UpdatableReference(this.context),
      parentNode: this.element,
      dynamicScope: new TestDynamicScope()
    });
  }
});

module("Rehydration Tests", class extends RenderTest {
  protected element: HTMLDivElement;

  constructor(env = new TestEnvironment()) {
    super(env);
    this.element = env.getDOM().createElement('div') as HTMLDivElement;
  }

  renderTemplate(template: Template<Opaque>) {
    // Emulate server-side render
    renderTemplate(new TestEnvironment(), template, {
      self: new UpdatableReference(this.context),
      parentNode: this.element,
      dynamicScope: new TestDynamicScope(),
      mode: 'serialize'
    });

    // Remove adjacent/empty text nodes
    this.element.innerHTML = this.element.innerHTML;

    // Client-side rehydration
    return renderTemplate(this.env, template, {
      self: new UpdatableReference(this.context),
      parentNode: this.element,
      dynamicScope: new TestDynamicScope(),
      mode: 'rehydrate'
    });
  }
});

function test(_target: Object, _name: string, descriptor: PropertyDescriptor): PropertyDescriptor | void {
  let testFunction = descriptor.value as Function;
  descriptor.enumerable = true;
  testFunction['isTest'] = true;
}

function module(name: string, klass: typeof RenderTest & Function): void {
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

function renderTemplate(env: TestEnvironment, template: Template<Opaque>, options: RenderOptions) {
  env.begin();

  let templateIterator = template.render(options);

  let iteratorResult: IteratorResult<RenderResult>;

  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  let result = iteratorResult.value;

  env.commit();

  return result;
}

function normalize(oldSnapshot: NodesSnapshot, newSnapshot: NodesSnapshot, except: Set<Node>) {
  let oldIterator = new SnapshotIterator(oldSnapshot);
  let newIterator = new SnapshotIterator(newSnapshot);

  let normalizedOld = [];
  let normalizedNew = [];

  while (true) {
    let next = oldIterator.peek();

    if (next === null && newIterator.peek() === null) break;

    if (next instanceof Node && except.has(next)) {
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
