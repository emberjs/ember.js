/**
 * How often a binding is evaluated (compat, GXT_MODE).
 *
 * Glimmer semantics: a reference computes its value once per revision, so
 * creating a binding evaluates its expression once; a getter is called exactly
 * when the binding is evaluated. A getter that a binding reads stays the
 * getter: a property cell defined over it would freeze its value.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import {
  AbstractStrictTestCase,
  assertHTML,
  buildOwner,
  moduleFor,
  RenderingTestCase,
  runTask,
} from 'internal-test-helpers';
import { notifyPropertyChange } from '@ember/object';
import type Owner from '@ember/owner';
import { renderComponent, renderSettled } from '@ember/renderer';
import { htmlSafe } from '@ember/template';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { associateDestroyableChild, destroy, registerDestructor } from '@glimmer/destroyable';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

moduleFor(
  'GXT bindings: a renderComponent root evaluates a binding once on creation',
  class extends AbstractStrictTestCase {
    owner: Owner;

    constructor(assert: QUnit['assert']) {
      super(assert);
      this.owner = buildOwner({});
      associateDestroyableChild(this, this.owner);
    }

    get element(): Element {
      return document.querySelector('#qunit-fixture')!;
    }

    async afterEach() {
      destroy(this);
      await renderSettled();
    }

    render(Root: object): void {
      const result = renderComponent(Root, { owner: this.owner, into: this.element });
      registerDestructor(this, () => result.destroy());
    }

    async '@test attribute, style and text bindings'(assert: QUnit['assert']) {
      let reads: string[] = [];
      class Root extends GlimmerComponent {
        @tracked n = 1;

        get title() {
          reads.push('title');
          return `title${this.n}`;
        }
        get styleValue() {
          reads.push('style');
          return htmlSafe(`width: ${this.n}px`);
        }
        get text() {
          reads.push('text');
          return `text${this.n}`;
        }
      }
      setComponentTemplate(
        precompileTemplate(
          '<div title={{this.title}} style={{this.styleValue}}>{{this.text}}</div>'
        ),
        Root
      );

      this.render(Root);
      const div = this.element.querySelector('div') as HTMLElement;
      assert.strictEqual(div.getAttribute('title'), 'title1');
      assert.strictEqual(div.style.width, '1px');
      assert.strictEqual(div.textContent, 'text1');
      assert.deepEqual(reads.sort(), ['style', 'text', 'title'], 'one evaluation each');
    }

    async '@test a SafeString text binding is rendered as HTML'(assert: QUnit['assert']) {
      let reads = 0;
      class Root extends GlimmerComponent {
        @tracked n = 1;

        get html() {
          reads++;
          return htmlSafe(`<b>bold${this.n}</b>`);
        }
      }
      setComponentTemplate(precompileTemplate('<p>{{this.html}}</p>'), Root);

      this.render(Root);
      assertHTML('<p><b>bold1</b></p>');
      assert.strictEqual(reads, 1, 'one evaluation');
    }
  }
);

moduleFor(
  'GXT bindings: a getter that a binding reads',
  class extends RenderingTestCase {
    ['@test is not frozen: notifyPropertyChange re-renders it'](assert: QUnit['assert']) {
      let probe: Probe | undefined;
      class Probe extends GlimmerComponent {
        value = 'a';

        constructor(owner: Owner, args: object) {
          super(owner, args);
          probe = this;
        }

        get top() {
          return `top-${this.value}`;
        }
        get text() {
          return `text-${this.value}`;
        }
      }
      this.owner.register(
        'component:probe',
        setComponentTemplate(precompileTemplate('{{this.top}}<p>{{this.text}}</p>'), Probe)
      );

      this.render('<Probe />');
      this.assertHTML('top-a<p>text-a</p>');
      assert.deepEqual(
        Object.keys(Object.getOwnPropertyDescriptors(probe!)).filter(
          (key) => key === 'top' || key === 'text'
        ),
        [],
        'rendering does not shadow the getters with own properties'
      );

      for (const value of ['b', 'c']) {
        runTask(() => {
          probe!.value = value;
          notifyPropertyChange(probe!, 'top');
          notifyPropertyChange(probe!, 'text');
        });
        this.assertHTML(`top-${value}<p>text-${value}</p>`);
      }
    }
  }
);
