/**
 * A component instance belongs to its invocation (compat, GXT_MODE).
 *
 * Glimmer semantics: each invocation of a component creates its own instance
 * (`@glimmer/runtime` `CreateComponentOpcode`), whose `this.args` (a classic
 * component's properties) are that invocation's arguments. An instance is
 * never handed to another invocation, also not to one rendered after a
 * re-render of the page; a re-render only updates each invocation's own
 * instance.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import Component from '@glimmer/component';
import ClassicComponent from '@ember/component';

moduleFor(
  'GXT a component instance belongs to its invocation',
  class extends RenderingTestCase {
    // `component:show-arg`: a Glimmer component rendering its `@value` through
    // `this.args`, that records each instance it creates.
    registerShowArg(instances: Component<{ value: string }>[]) {
      this.owner.register(
        'component:show-arg',
        setComponentTemplate(
          precompileTemplate('[{{this.value}}]'),
          class extends Component<{ value: string }> {
            constructor(owner: object, args: { value: string }) {
              super(owner, args);
              instances.push(this);
            }
            get value() {
              return this.args.value;
            }
          }
        )
      );
    }

    ['@test an invocation rendered after a re-render gets its own instance']() {
      let instances: Component<{ value: string }>[] = [];
      this.registerShowArg(instances);

      this.render('<ShowArg @value="a" />{{#if this.show}}<ShowArg @value="b" />{{/if}}', {
        show: false,
      });
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each invocation has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.args.value),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
    }

    ['@test a row added after a re-render gets its own instance']() {
      let instances: Component<{ value: string }>[] = [];
      this.registerShowArg(instances);

      this.render('{{#each this.list as |item|}}<ShowArg @value={{item}} />{{/each}}', {
        list: ['a'],
      });
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'list', ['a', 'b']));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each row has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.args.value),
        ['a', 'b'],
        'each instance has the arguments of its row'
      );

      runTask(() => set(this.context, 'list', ['b']));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the remaining row keeps its instance');
      this.assert.strictEqual(instances[1]!.args.value, 'b');
    }

    // `component:classic-show-arg`: a tagless classic component rendering its
    // `value`, that records each instance it creates.
    registerClassicShowArg(instances: ClassicComponent[]) {
      this.owner.register(
        'component:classic-show-arg',
        setComponentTemplate(
          precompileTemplate('[{{this.value}}]'),
          class extends ClassicComponent {
            tagName = '';
            init(properties?: object) {
              super.init(properties);
              instances.push(this);
            }
          }
        )
      );
    }

    ['@test a classic invocation rendered after a re-render gets its own instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{classic-show-arg value="a"}}{{#if this.show}}{{classic-show-arg value="b"}}{{/if}}',
        { show: false }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each invocation has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
      this.assert.false(instances[0]!.isDestroying, 'the first invocation keeps its instance');
    }

    ['@test a classic invocation in the other branch of an {{#if}} gets its own instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{#if this.cond}}{{classic-show-arg value="a"}}{{else}}{{classic-show-arg value="b"}}{{/if}}',
        { cond: true }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'cond', false));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the other branch has its own instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
      this.assert.true(instances[0]!.isDestroying, 'the removed branch destroys its instance');

      runTask(() => set(this.context, 'cond', true));

      this.assertText('[a]');
      this.assert.strictEqual(instances.length, 3, 'the branch rendered again has a new instance');
      this.assert.strictEqual(instances[2]!.get('value'), 'a');
      this.assert.true(instances[1]!.isDestroying, 'the removed branch destroys its instance');
    }

    ['@test a classic row added after a re-render gets its own instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render('{{#each this.list as |item|}}{{classic-show-arg value=item}}{{/each}}', {
        list: ['a'],
      });
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'list', ['a', 'b']));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each row has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each instance has the arguments of its row'
      );
      this.assert.false(instances[0]!.isDestroying, 'the first row keeps its instance');

      runTask(() => set(this.context, 'list', ['b']));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the remaining row keeps its instance');
      this.assert.strictEqual(instances[1]!.get('value'), 'b');
      this.assert.false(instances[1]!.isDestroying, 'the remaining row keeps its instance');
      this.assert.true(instances[0]!.isDestroying, 'the removed row destroys its instance');
    }

    ['@test a classic row of another {{#each}} over the same items gets its own instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{#each this.list as |item|}}{{classic-show-arg value=item}}{{/each}}' +
          '{{#if this.show}}{{#each this.list as |item|}}{{classic-show-arg value=(concat item "!")}}{{/each}}{{/if}}',
        { list: ['a'], show: false }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][a!]');
      this.assert.strictEqual(instances.length, 2, 'each row has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'a!'],
        'each instance has the arguments of its row'
      );
      this.assert.false(instances[0]!.isDestroying, 'the first row keeps its instance');
    }

    ['@test a {{component}} invocation rendered after a re-render gets its own classic instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{component this.name value="a"}}{{#if this.show}}{{component this.name value="b"}}{{/if}}',
        { name: 'classic-show-arg', show: false }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each invocation has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
      this.assert.false(instances[0]!.isDestroying, 'the first invocation keeps its instance');
    }

    ['@test a {{component}} invocation in the other branch of an {{#if}} gets its own classic instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{#if this.cond}}{{component this.name value="a"}}{{else}}{{component this.name value="b"}}{{/if}}',
        { name: 'classic-show-arg', cond: true }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'cond', false));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the other branch has its own instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
      this.assert.true(instances[0]!.isDestroying, 'the removed branch destroys its instance');
    }

    ['@test a {{component}} row of another {{#each}} over the same items gets its own classic instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{#each this.list as |item|}}{{component this.name value=item}}{{/each}}' +
          '{{#if this.show}}{{#each this.list as |item|}}{{component this.name value=(concat item "!")}}{{/each}}{{/if}}',
        { name: 'classic-show-arg', list: ['a'], show: false }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][a!]');
      this.assert.strictEqual(instances.length, 2, 'each row has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'a!'],
        'each instance has the arguments of its row'
      );
      this.assert.false(instances[0]!.isDestroying, 'the first row keeps its instance');
    }

    ['@test a classic block invocation rendered after a re-render gets its own instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{#classic-show-arg value="a"}}{{/classic-show-arg}}' +
          '{{#if this.show}}{{#classic-show-arg value="b"}}{{/classic-show-arg}}{{/if}}',
        { show: false }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each invocation has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
      this.assert.false(instances[0]!.isDestroying, 'the first invocation keeps its instance');
    }

    ['@test a curried classic component invoked with angle brackets after a re-render gets its own instance']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);

      this.render(
        '{{#let (component "classic-show-arg" value="a") as |C|}}<C />{{/let}}' +
          '{{#if this.show}}{{#let (component "classic-show-arg" value="b") as |C|}}<C />{{/let}}{{/if}}',
        { show: false }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][b]');
      this.assert.strictEqual(instances.length, 2, 'each invocation has an instance');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each instance has the arguments of its invocation'
      );
    }

    ['@test a classic block invocation rendered after a re-render renders its own arguments']() {
      let instances: ClassicComponent[] = [];
      this.registerClassicShowArg(instances);
      this.owner.register(
        'component:curry-show-arg',
        setComponentTemplate(
          precompileTemplate('{{yield (component "classic-show-arg" value=this.value)}}'),
          class extends ClassicComponent {
            tagName = '';
          }
        )
      );

      this.render(
        '{{#curry-show-arg value="a" as |show|}}{{show}}{{/curry-show-arg}}' +
          '{{#if this.show}}{{#curry-show-arg value="b" as |show|}}{{show}}{{/curry-show-arg}}{{/if}}',
        { show: false }
      );
      this.assertText('[a]');
      this.assertStableRerender();

      runTask(() => set(this.context, 'show', true));

      this.assertText('[a][b]');
      this.assert.deepEqual(
        instances.map((instance) => instance.get('value')),
        ['a', 'b'],
        'each yielded component has the arguments of its invocation'
      );
    }
  }
);

moduleFor(
  'GXT a curried component keeps its instance while its curried value stays',
  class extends RenderingTestCase {
    // `component:yield-curried`: yields `(component <name> value=this.v)`.
    // Glimmer's curry reference keeps its curried value while the definition
    // stays; the curried arguments are references, so a change of `v` updates
    // the component the curried value rendered.
    registerYieldCurried(name: string) {
      this.owner.register(
        'component:yield-curried',
        setComponentTemplate(
          precompileTemplate(`{{yield (component "${name}" value=this.v)}}`),
          class extends ClassicComponent {
            tagName = '';
          }
        )
      );
    }

    ['@test a classic component rendered by {{x}} is updated when a curried argument changes']() {
      let hooks: string[] = [];
      let instances: ClassicComponent[] = [];
      this.owner.register(
        'component:classic-show-arg',
        setComponentTemplate(
          precompileTemplate('[{{this.value}}]'),
          class extends ClassicComponent {
            tagName = '';
            init(properties?: object) {
              super.init(properties);
              instances.push(this);
            }
            didUpdateAttrs() {
              hooks.push(`didUpdateAttrs ${this.get('value')}`);
            }
            didInsertElement() {
              hooks.push(`didInsertElement ${this.get('value')}`);
            }
            willDestroy() {
              super.willDestroy();
              hooks.push(`willDestroy ${this.get('value')}`);
            }
          }
        )
      );
      this.registerYieldCurried('classic-show-arg');

      this.render('{{#yield-curried v=this.v as |x|}}{{x}}{{/yield-curried}}', { v: 'a' });
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'v', 'b'));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 1, 'the component keeps its instance');
      this.assert.deepEqual(hooks, ['didUpdateAttrs b'], 'the instance is updated');
    }

    ['@test a Glimmer component rendered by {{x}} is updated when a curried argument changes']() {
      let instances: Component<{ value: string }>[] = [];
      this.owner.register(
        'component:show-arg',
        setComponentTemplate(
          precompileTemplate('[{{@value}}]'),
          class extends Component<{ value: string }> {
            constructor(owner: object, args: { value: string }) {
              super(owner, args);
              instances.push(this);
            }
          }
        )
      );
      this.registerYieldCurried('show-arg');

      this.render('{{#yield-curried v=this.v as |x|}}{{x}}{{/yield-curried}}', { v: 'a' });
      this.assertText('[a]');

      runTask(() => set(this.context, 'v', 'b'));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 1, 'the component keeps its instance');
      this.assert.strictEqual(instances[0]!.args.value, 'b', 'its arguments are updated');
    }
  }
);

moduleFor(
  'GXT a curried content region renders its own component',
  class extends RenderingTestCase {
    // `component:classic-show-arg`: a tagless classic component rendering its
    // `value`, that records each instance it creates and its hooks.
    registerClassicShowArg(instances: ClassicComponent[], hooks: string[]) {
      this.owner.register(
        'component:classic-show-arg',
        setComponentTemplate(
          precompileTemplate('[{{this.value}}]'),
          class extends ClassicComponent {
            tagName = '';
            init(properties?: object) {
              super.init(properties);
              instances.push(this);
              hooks.push(`init ${this.get('value')}`);
            }
            didUpdateAttrs() {
              hooks.push(`didUpdateAttrs ${this.get('value')}`);
            }
            willDestroy() {
              super.willDestroy();
              hooks.push(`willDestroy ${this.get('value')}`);
            }
          }
        )
      );
    }

    // `component:show-arg`: a Glimmer component rendering its `@value`, that
    // records each instance it creates and its destruction.
    registerShowArg(instances: Component<{ value: string }>[], hooks: string[]) {
      this.owner.register(
        'component:show-arg',
        setComponentTemplate(
          precompileTemplate('[{{@value}}]'),
          class extends Component<{ value: string }> {
            constructor(owner: object, args: { value: string }) {
              super(owner, args);
              instances.push(this);
              hooks.push(`constructor ${args.value}`);
            }
            willDestroy() {
              super.willDestroy();
              hooks.push(`willDestroy ${this.args.value}`);
            }
          }
        )
      );
    }

    ['@test two regions rendered by updates get their own classic instances']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);

      this.render(
        '{{#let (if this.c (component "classic-show-arg" value="a") (component "classic-show-arg" value="b"))' +
          ' (if this.d (component "classic-show-arg" value="c") (component "classic-show-arg" value="d"))' +
          ' as |x y|}}{{x}}{{y}}{{/let}}',
        { c: true, d: true }
      );
      this.assertText('[a][c]');
      runTask(() => set(this.context, 'c', false));
      this.assertText('[b][c]');

      runTask(() => set(this.context, 'd', false));

      this.assertText('[b][d]');
      let live = instances.filter((instance) => !instance.isDestroying);
      this.assert.deepEqual(
        live.map((instance) => instance.get('value')),
        ['b', 'd'],
        'each region has an instance with the arguments of its curried value'
      );
    }

    ['@test a region destroys the classic component of the curried value it replaces']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);

      this.render(
        '{{#let (if this.c (component "classic-show-arg" value="a") (component "classic-show-arg" value="b")) as |x|}}{{x}}{{/let}}',
        { c: true }
      );
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'c', false));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the new curried value has its own instance');
      this.assert.deepEqual(
        hooks,
        ['init b', 'willDestroy a'],
        'the replaced instance is destroyed'
      );
      this.assert.true(instances[0]!.isDestroyed, 'the replaced instance is destroyed');
      this.assert.false(instances[1]!.isDestroying, 'the new instance stays');

      runTask(() => set(this.context, 'c', true));

      this.assertText('[a]');
      this.assert.strictEqual(
        instances.length,
        3,
        'the curried value rendered again has a new instance'
      );
      this.assert.true(instances[1]!.isDestroyed, 'the replaced instance is destroyed');
    }

    ['@test a region destroys the Glimmer component of the curried value it replaces']() {
      let instances: Component<{ value: string }>[] = [];
      let hooks: string[] = [];
      this.registerShowArg(instances, hooks);

      this.render(
        '{{#let (if this.c (component "show-arg" value="a") (component "show-arg" value="b")) as |x|}}{{x}}{{/let}}',
        { c: true }
      );
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'c', false));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the new curried value has its own instance');
      this.assert.deepEqual(
        hooks,
        ['constructor b', 'willDestroy a'],
        'the replaced instance is destroyed'
      );
    }

    ['@test a region destroys a tagless classic component of another definition it replaces']() {
      let hooks: string[] = [];
      for (let name of ['first', 'second']) {
        this.owner.register(
          `component:${name}-item`,
          setComponentTemplate(
            precompileTemplate(`[${name}]`),
            class extends ClassicComponent {
              tagName = '';
              willDestroy() {
                super.willDestroy();
                hooks.push(`willDestroy ${name}`);
              }
            }
          )
        );
      }

      this.render(
        '{{#let (if this.c (component "first-item") (component "second-item")) as |x|}}{{x}}{{/let}}',
        { c: true }
      );
      this.assertText('[first]');

      runTask(() => set(this.context, 'c', false));

      this.assertText('[second]');
      this.assert.deepEqual(hooks, ['willDestroy first'], 'the replaced component is destroyed');
    }

    ['@test a region destroys the component it replaces with text']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);

      this.render(
        '{{#let (if this.c (component "classic-show-arg" value="a") "text") as |x|}}{{x}}{{/let}}',
        { c: true }
      );
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'c', false));

      this.assertText('text');
      this.assert.deepEqual(hooks, ['willDestroy a'], 'the replaced component is destroyed');
    }

    ['@test the component a region renders after a change leaves with the region']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);
      this.owner.register(
        'component:show-either',
        setComponentTemplate(
          precompileTemplate(
            '{{#let (if @c (component "classic-show-arg" value="a") (component "classic-show-arg" value="b")) as |x|}}{{x}}{{/let}}'
          ),
          class extends ClassicComponent {
            tagName = '';
          }
        )
      );

      this.render('{{#if this.show}}{{show-either c=this.c}}{{/if}}', { show: true, c: true });
      this.assertText('[a]');
      runTask(() => set(this.context, 'c', false));
      this.assertText('[b]');
      hooks.length = 0;

      runTask(() => set(this.context, 'show', false));

      this.assertText('');
      this.assert.deepEqual(hooks, ['willDestroy b'], 'the component is destroyed with the region');
    }

    ['@test a region in an element destroys the component of the curried value it replaces']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);

      this.render(
        '<p>{{#let (if this.c (component "classic-show-arg" value="a") (component "classic-show-arg" value="b")) as |x|}}{{x}}{{/let}}</p>',
        { c: true }
      );
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'c', false));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 2, 'the new curried value has its own instance');
      this.assert.deepEqual(
        hooks,
        ['init b', 'willDestroy a'],
        'the replaced instance is destroyed'
      );
    }

    ['@test a let-bound curried classic component in an element is updated when a curried argument changes']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);

      this.render(
        '<p>{{#let (component "classic-show-arg" value=this.v) as |x|}}{{x}}{{/let}}</p>',
        { v: 'a' }
      );
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'v', 'b'));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 1, 'the component keeps its instance');
      this.assert.deepEqual(hooks, ['didUpdateAttrs b'], 'the instance is updated');
    }

    ['@test a let-bound curried classic component is updated when a curried argument changes']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);

      this.render('{{#let (component "classic-show-arg" value=this.v) as |x|}}{{x}}{{/let}}', {
        v: 'a',
      });
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'v', 'b'));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 1, 'the component keeps its instance');
      this.assert.deepEqual(hooks, ['didUpdateAttrs b'], 'the instance is updated');
    }

    ['@test a curried classic component of a yielded (hash) is updated when a curried argument changes']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);
      this.owner.register(
        'component:yield-hash',
        setComponentTemplate(
          precompileTemplate('{{yield (hash item=(component "classic-show-arg" value=this.v))}}'),
          class extends ClassicComponent {
            tagName = '';
          }
        )
      );

      this.render('{{#yield-hash v=this.v as |h|}}{{h.item}}{{/yield-hash}}', { v: 'a' });
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'v', 'b'));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 1, 'the component keeps its instance');
      this.assert.deepEqual(hooks, ['didUpdateAttrs b'], 'the instance is updated');
    }

    ['@test a let-bound curried Glimmer component is updated when a curried argument changes']() {
      let instances: Component<{ value: string }>[] = [];
      let hooks: string[] = [];
      this.registerShowArg(instances, hooks);

      this.render('{{#let (component "show-arg" value=this.v) as |x|}}{{x}}{{/let}}', { v: 'a' });
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'v', 'b'));

      this.assertText('[b]');
      this.assert.strictEqual(instances.length, 1, 'the component keeps its instance');
      this.assert.deepEqual(hooks, [], 'no component is created or destroyed');
      this.assert.strictEqual(instances[0]!.args.value, 'b', 'its arguments are updated');
    }

    // `component:yield-either`: a tagless classic component yielding
    // `(if @c <first> <second>)`.
    registerYieldEither(first: string, second: string) {
      this.owner.register(
        'component:yield-either',
        setComponentTemplate(
          precompileTemplate(`{{yield (if this.c ${first} ${second})}}`),
          class extends ClassicComponent {
            tagName = '';
          }
        )
      );
    }

    ['@test a block renders the component of a yielded (if) curried value and replaces it']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);
      this.registerYieldEither(
        '(component "classic-show-arg" value="a")',
        '(component "classic-show-arg" value="b")'
      );

      this.render('{{#yield-either c=this.c as |x|}}{{x}}{{/yield-either}}', { c: true });
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'c', false));

      this.assertText('[b]');
      this.assert.deepEqual(
        hooks,
        ['init b', 'willDestroy a'],
        'the new curried value renders its own instance, the replaced one is destroyed'
      );

      runTask(() => set(this.context, 'c', true));

      this.assertText('[a]');
      this.assert.strictEqual(instances.length, 3, 'each curried value has its own instance');
      this.assert.true(instances[1]!.isDestroyed, 'the replaced instance is destroyed');
    }

    ['@test a block renders a yielded (if) value that changes from a curried component to text']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);
      this.registerYieldEither('(component "classic-show-arg" value="a")', '"text"');

      this.render('{{#yield-either c=this.c as |x|}}{{x}}{{/yield-either}}', { c: true });
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'c', false));

      this.assertText('text');
      this.assert.deepEqual(hooks, ['willDestroy a'], 'the replaced component is destroyed');

      runTask(() => set(this.context, 'c', true));

      this.assertText('[a]');
      this.assert.strictEqual(instances.length, 2, 'the curried value renders a new instance');
    }

    ['@test a block renders the component of a yielded (component this.name) and follows the name']() {
      let hooks: string[] = [];
      for (let name of ['first', 'second']) {
        this.owner.register(
          `component:${name}-item`,
          setComponentTemplate(
            precompileTemplate(`[${name}]`),
            class extends ClassicComponent {
              tagName = '';
              willDestroy() {
                super.willDestroy();
                hooks.push(`willDestroy ${name}`);
              }
            }
          )
        );
      }
      this.owner.register(
        'component:yield-named',
        setComponentTemplate(
          precompileTemplate('{{yield (component this.name)}}'),
          class extends ClassicComponent {
            tagName = '';
          }
        )
      );

      this.render('{{#yield-named name=this.name as |x|}}{{x}}{{/yield-named}}', {
        name: 'first-item',
      });
      this.assertText('[first]');

      runTask(() => set(this.context, 'name', 'second-item'));

      this.assertText('[second]');
      this.assert.deepEqual(hooks, ['willDestroy first'], 'the replaced component is destroyed');
    }

    ['@test a block renders the component of a yielded (if) curried value in an element']() {
      let instances: ClassicComponent[] = [];
      let hooks: string[] = [];
      this.registerClassicShowArg(instances, hooks);
      this.registerYieldEither(
        '(component "classic-show-arg" value="a")',
        '(component "classic-show-arg" value="b")'
      );

      this.render('{{#yield-either c=this.c as |x|}}<p>{{x}}</p>{{/yield-either}}', { c: true });
      this.assertText('[a]');
      hooks.length = 0;

      runTask(() => set(this.context, 'c', false));

      this.assertText('[b]');
      this.assert.deepEqual(
        hooks,
        ['init b', 'willDestroy a'],
        'the new curried value renders its own instance, the replaced one is destroyed'
      );
    }
  }
);
