var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { EmberishGlimmerComponent } from '../components';
import { stripTight } from '../test-helpers/strings';
export class FragmentComponents extends RenderTest {
    'creating a new component'() {
        this.render({
            name: 'MyComponent',
            layout: '{{yield}} - {{@color}}',
            template: 'hello!',
            args: { color: 'color' },
        }, { color: 'red' });
        this.assertHTML(`hello! - red`);
        this.assertStableRerender();
        this.rerender({ color: 'green' });
        this.assertHTML(`hello! - green`);
        this.assertStableNodes();
        this.rerender({ color: 'red' });
        this.assertHTML(`hello! - red`);
        this.assertStableNodes();
    }
    'inner ...attributes'() {
        this.render({
            name: 'MyComponent',
            layout: '<div><span ...attributes>{{yield}} - {{@color}}</span></div>',
            template: 'hello!',
            args: { color: 'color' },
            attributes: { color: '{{color}}' },
        }, { color: 'red' });
        this.assertHTML(`<div><span color='red'>hello! - red</span></div>`);
        this.assertStableRerender();
        this.rerender({ color: 'green' });
        this.assertHTML(`<div><span color='green'>hello! - green</span></div>`);
        this.assertStableNodes();
        this.rerender({ color: 'red' });
        this.assertHTML(`<div><span color='red'>hello! - red</span></div>`);
        this.assertStableNodes();
    }
}
FragmentComponents.suiteName = 'Fragments';
__decorate([
    test({
        kind: 'fragment',
    })
], FragmentComponents.prototype, "creating a new component", null);
__decorate([
    test({
        kind: 'fragment',
    })
], FragmentComponents.prototype, "inner ...attributes", null);
export class BasicComponents extends RenderTest {
    'creating a new component'() {
        this.render({
            name: 'MyComponent',
            layout: '{{yield}}',
            template: 'hello!',
            attributes: { color: '{{color}}' },
        }, { color: 'red' });
        this.assertHTML(`<div color='red'>hello!</div>`);
        this.assertStableRerender();
        this.rerender({ color: 'green' });
        this.assertHTML(`<div color='green'>hello!</div>`);
        this.assertStableNodes();
        this.rerender({ color: 'red' });
        this.assertHTML(`<div color='red'>hello!</div>`);
        this.assertStableNodes();
    }
    'creating a new component passing args'() {
        this.render({
            name: 'MyComponent',
            layout: '{{@arg1}}{{yield}}',
            template: 'hello!',
            args: { arg1: "'hello - '" },
            attributes: { color: '{{color}}' },
        }, { color: 'red' });
        this.assertHTML("<div color='red'>hello - hello!</div>");
        this.assertStableRerender();
        this.rerender({ color: 'green' });
        this.assertHTML("<div color='green'>hello - hello!</div>");
        this.assertStableNodes();
        this.rerender({ color: 'red' });
        this.assertHTML("<div color='red'>hello - hello!</div>");
        this.assertStableNodes();
    }
    'creating a new component passing named blocks'() {
        this.render({
            name: 'MyComponent',
            layout: '{{@arg1}}{{yield to="hello"}}',
            template: '<:hello>world!</:hello>',
            args: { arg1: "'hello - '" },
            attributes: { color: '{{color}}' },
        }, { color: 'red' });
        this.assertHTML("<div color='red'>hello - world!</div>");
        this.assertStableRerender();
        this.rerender({ color: 'green' });
        this.assertHTML("<div color='green'>hello - world!</div>");
        this.assertStableNodes();
        this.rerender({ color: 'red' });
        this.assertHTML("<div color='red'>hello - world!</div>");
        this.assertStableNodes();
    }
    'creating a new component passing named blocks that take block params'() {
        this.render({
            name: 'MyComponent',
            layout: '{{@arg1}}{{yield "!" to="hello"}}',
            template: '<:hello as |punc|>world{{punc}}</:hello>',
            args: { arg1: "'hello - '" },
            attributes: { color: '{{color}}' },
        }, { color: 'red' });
        this.assertHTML("<div color='red'>hello - world!</div>");
        this.assertStableRerender();
        this.rerender({ color: 'green' });
        this.assertHTML("<div color='green'>hello - world!</div>");
        this.assertStableNodes();
        this.rerender({ color: 'red' });
        this.assertHTML("<div color='red'>hello - world!</div>");
        this.assertStableNodes();
    }
    'creating a new component passing dynamic args'() {
        this.render({
            name: 'MyComponent',
            layout: '{{@arg1}}{{yield}}',
            template: 'hello!',
            args: { arg1: 'left' },
            attributes: { color: '{{color}}' },
        }, { color: 'red', left: 'left - ' });
        this.assertHTML("<div color='red'>left - hello!</div>");
        this.assertStableRerender();
        this.rerender({ color: 'green', left: 'LEFT - ' });
        this.assertHTML("<div color='green'>LEFT - hello!</div>");
        this.assertStableNodes();
        this.rerender({ color: 'red', left: 'left - ' });
        this.assertHTML("<div color='red'>left - hello!</div>");
        this.assertStableNodes();
    }
    'creating a new component yielding values'() {
        this.render({
            name: 'MyComponent',
            layout: '{{@arg1}}{{yield @yieldme}}',
            template: 'hello! {{yielded}}',
            blockParams: ['yielded'],
            args: { arg1: 'left', yieldme: "'yield me'" },
            attributes: { color: '{{color}}' },
        }, { color: 'red', left: 'left - ' });
        this.assertHTML("<div color='red'>left - hello! yield me</div>");
        this.assertStableRerender();
        this.rerender({ color: 'green', left: 'LEFT - ' });
        this.assertHTML("<div color='green'>LEFT - hello! yield me</div>");
        this.assertStableNodes();
        this.rerender({ color: 'red', left: 'left - ' });
        this.assertHTML("<div color='red'>left - hello! yield me</div>");
        this.assertStableNodes();
    }
    'invoking dynamic component (named arg) via angle brackets'() {
        this.registerComponent('Glimmer', 'Foo', 'hello world!');
        this.render({
            layout: '<@foo />',
            args: {
                foo: 'component "Foo"',
            },
        });
        this.assertHTML(`<div>hello world!</div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (named arg path) via angle brackets'() {
        this.registerHelper('hash', (_positional, named) => named);
        this.registerComponent('Glimmer', 'Foo', 'hello world!');
        this.render({
            layout: '<@stuff.Foo />',
            args: {
                stuff: 'hash Foo=(component "Foo")',
            },
        });
        this.assertHTML(`<div>hello world!</div>`);
        this.assertStableRerender();
    }
    'invoking curried component with attributes via angle brackets (invocation attributes clobber)'() {
        this.registerHelper('hash', (_positional, named) => named);
        this.registerComponent('Glimmer', 'Foo', '<p data-foo="default" ...attributes>hello world!</p>');
        this.render({
            layout: '<@stuff.Foo data-foo="invocation" />',
            args: {
                stuff: 'hash Foo=(component "Foo")',
            },
        });
        this.assertHTML(`<div><p data-foo="invocation">hello world!</p></div>`);
        this.assertStableRerender();
    }
    'invoking curried component with attributes via angle brackets (invocation classes merge)'() {
        this.registerHelper('hash', (_positional, named) => named);
        this.registerComponent('Glimmer', 'Foo', '<p class="default" ...attributes>hello world!</p>');
        this.render({
            layout: '<@stuff.Foo class="invocation" />',
            args: {
                stuff: 'hash Foo=(component "Foo")',
            },
        });
        this.assertHTML(`<div><p class="default invocation">hello world!</p></div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (named arg) via angle brackets supports attributes (invocation attributes clobber)'() {
        this.registerComponent('Glimmer', 'Foo', '<div data-test="default" ...attributes>hello world!</div>');
        this.render({
            layout: '<@foo data-test="foo"/>',
            args: {
                foo: 'component "Foo"',
            },
        });
        this.assertHTML(`<div><div data-test="foo">hello world!</div></div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (named arg) via angle brackets supports attributes'() {
        this.registerComponent('Glimmer', 'Foo', '<div ...attributes>hello world!</div>');
        this.render({
            layout: '<@foo data-test="foo"/>',
            args: {
                foo: 'component "Foo"',
            },
        });
        this.assertHTML(`<div><div data-test="foo">hello world!</div></div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (named arg) via angle brackets supports args'() {
        this.registerComponent('Glimmer', 'Foo', 'hello {{@name}}!');
        this.render({
            layout: '<@foo @name="world" />',
            args: {
                foo: 'component "Foo"',
            },
        });
        this.assertHTML(`<div>hello world!</div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (named arg) via angle brackets supports passing a block'() {
        this.registerComponent('Glimmer', 'Foo', 'hello {{yield}}!');
        this.render({
            layout: '<@foo>world</@foo>',
            args: {
                foo: 'component "Foo"',
            },
        });
        this.assertHTML(`<div>hello world!</div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (named arg) via angle brackets supports args and attributes'() {
        let instance;
        class Foo extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                instance = this;
                this.localProperty = 'local';
            }
        }
        this.registerComponent('Glimmer', 'Foo', '<div ...attributes>[{{localProperty}} {{@staticNamedArg}} {{@dynamicNamedArg}}]</div>', Foo);
        this.render({
            layout: stripTight `<@foo @staticNamedArg="static" data-test1={{@outerArg}} data-test2="static" @dynamicNamedArg={{@outerArg}} />`,
            args: {
                foo: 'component "Foo"',
                outerArg: 'outer',
            },
        }, { outer: 'outer' });
        this.assertHTML(`<div><div data-test1="outer" data-test2="static">[local static outer]</div></div>`);
        this.assertStableRerender();
        this.rerender({ outer: 'OUTER' });
        this.assertHTML(`<div><div data-test1="OUTER" data-test2="static">[local static OUTER]</div></div>`);
        instance.localProperty = 'LOCAL';
        instance.recompute();
        this.rerender();
        this.assertHTML(`<div><div data-test1="OUTER" data-test2="static">[LOCAL static OUTER]</div></div>`);
        instance.localProperty = 'local';
        instance.recompute();
        this.rerender({ outer: 'outer' });
        this.assertHTML(`<div><div data-test1="outer" data-test2="static">[local static outer]</div></div>`);
    }
    'invoking dynamic component (local) via angle brackets'() {
        this.registerComponent('Glimmer', 'Foo', 'hello world!');
        this.render(`{{#with (component 'Foo') as |Other|}}<Other />{{/with}}`);
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (local path) via angle brackets'() {
        this.registerHelper('hash', (_positional, named) => named);
        this.registerComponent('Glimmer', 'Foo', 'hello world!');
        this.render(`{{#with (hash Foo=(component 'Foo')) as |Other|}}<Other.Foo />{{/with}}`);
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (local) via angle brackets (ill-advised "htmlish element name" but supported)'() {
        this.registerComponent('Glimmer', 'Foo', 'hello world!');
        this.render(`{{#with (component 'Foo') as |div|}}<div />{{/with}}`);
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (local) via angle brackets supports attributes'() {
        this.registerComponent('Glimmer', 'Foo', '<div ...attributes>hello world!</div>');
        this.render(`{{#with (component 'Foo') as |Other|}}<Other data-test="foo" />{{/with}}`);
        this.assertHTML(`<div data-test="foo">hello world!</div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (local) via angle brackets supports args'() {
        this.registerComponent('Glimmer', 'Foo', 'hello {{@name}}!');
        this.render(`{{#with (component 'Foo') as |Other|}}<Other @name="world" />{{/with}}`);
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (local) via angle brackets supports passing a block'() {
        this.registerComponent('Glimmer', 'Foo', 'hello {{yield}}!');
        this.render(`{{#with (component 'Foo') as |Other|}}<Other>world</Other>{{/with}}`);
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (local) via angle brackets supports args, attributes, and blocks'() {
        let instance;
        class Foo extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                instance = this;
                this.localProperty = 'local';
            }
        }
        this.registerComponent('Glimmer', 'Foo', '<div ...attributes>[{{localProperty}} {{@staticNamedArg}} {{@dynamicNamedArg}}] - {{yield}}</div>', Foo);
        this.render(`{{#with (component 'Foo') as |Other|}}<Other @staticNamedArg="static" data-test1={{outer}} data-test2="static" @dynamicNamedArg={{outer}}>template</Other>{{/with}}`, { outer: 'outer' });
        this.assertHTML(`<div data-test1="outer" data-test2="static">[local static outer] - template</div>`);
        this.assertStableRerender();
        this.rerender({ outer: 'OUTER' });
        this.assertHTML(`<div data-test1="OUTER" data-test2="static">[local static OUTER] - template</div>`);
        instance.localProperty = 'LOCAL';
        instance.recompute();
        this.rerender();
        this.assertHTML(`<div data-test1="OUTER" data-test2="static">[LOCAL static OUTER] - template</div>`);
        instance.localProperty = 'local';
        instance.recompute();
        this.rerender({ outer: 'outer' });
        this.assertHTML(`<div data-test1="outer" data-test2="static">[local static outer] - template</div>`);
    }
    'invoking dynamic component (path) via angle brackets'() {
        class TestHarness extends EmberishGlimmerComponent {
        }
        this.registerComponent('Glimmer', 'TestHarness', '<this.Foo />', TestHarness);
        this.registerComponent('Glimmer', 'Foo', 'hello world!');
        this.render('<TestHarness @Foo={{component "Foo"}} />');
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (path) via angle brackets does not support implicit `this` fallback'() {
        class TestHarness extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                this.stuff = {
                    Foo: args.attrs.Foo,
                };
            }
        }
        this.registerComponent('Glimmer', 'TestHarness', '<stuff.Foo />', TestHarness);
        this.registerComponent('Glimmer', 'Foo', 'hello world!', class extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                throw new Error('Should not have instantiated Foo component.');
            }
        });
        this.render('<TestHarness @Foo={{component "Foo"}} />');
        this.assertStableRerender();
    }
    'invoking dynamic component (path) via angle brackets supports attributes'() {
        class TestHarness extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                this.Foo = args.attrs.Foo;
            }
        }
        this.registerComponent('Glimmer', 'TestHarness', '<this.Foo data-test="foo"/>', TestHarness);
        this.registerComponent('Glimmer', 'Foo', '<div ...attributes>hello world!</div>');
        this.render('<TestHarness @Foo={{component "Foo"}} />');
        this.assertHTML(`<div data-test="foo">hello world!</div>`);
        this.assertStableRerender();
    }
    'invoking dynamic component (path) via angle brackets supports args'() {
        class TestHarness extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                this.Foo = args.attrs.Foo;
            }
        }
        this.registerComponent('Glimmer', 'TestHarness', '<this.Foo @name="world"/>', TestHarness);
        this.registerComponent('Glimmer', 'Foo', 'hello {{@name}}!');
        this.render('<TestHarness @Foo={{component "Foo"}} />');
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (path) via angle brackets supports passing a block'() {
        class TestHarness extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                this.Foo = args.attrs.Foo;
            }
        }
        this.registerComponent('Glimmer', 'TestHarness', '<this.Foo>world</this.Foo>', TestHarness);
        this.registerComponent('Glimmer', 'Foo', 'hello {{yield}}!');
        this.render('<TestHarness @Foo={{component "Foo"}} />');
        this.assertHTML(`hello world!`);
        this.assertStableRerender();
    }
    'invoking dynamic component (path) via angle brackets supports args, attributes, and blocks'() {
        let instance;
        class TestHarness extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                this.Foo = args.attrs.Foo;
            }
        }
        class Foo extends EmberishGlimmerComponent {
            constructor(args) {
                super(args);
                instance = this;
                this.localProperty = 'local';
            }
        }
        this.registerComponent('Glimmer', 'TestHarness', '<this.Foo @staticNamedArg="static" data-test1={{@outer}} data-test2="static" @dynamicNamedArg={{@outer}}>template</this.Foo>', TestHarness);
        this.registerComponent('Glimmer', 'Foo', '<div ...attributes>[{{localProperty}} {{@staticNamedArg}} {{@dynamicNamedArg}}] - {{yield}}</div>', Foo);
        this.render('<TestHarness @outer={{outer}} @Foo={{component "Foo"}} />', { outer: 'outer' });
        this.assertHTML(`<div data-test1="outer" data-test2="static">[local static outer] - template</div>`);
        this.assertStableRerender();
        this.rerender({ outer: 'OUTER' });
        this.assertHTML(`<div data-test1="OUTER" data-test2="static">[local static OUTER] - template</div>`);
        instance.localProperty = 'LOCAL';
        instance.recompute();
        this.rerender();
        this.assertHTML(`<div data-test1="OUTER" data-test2="static">[LOCAL static OUTER] - template</div>`);
        instance.localProperty = 'local';
        instance.recompute();
        this.rerender({ outer: 'outer' });
        this.assertHTML(`<div data-test1="outer" data-test2="static">[local static outer] - template</div>`);
    }
    'angle bracket invocation can pass forward ...attributes to a nested component'() {
        this.registerComponent('Glimmer', 'Qux', '<div data-from-qux ...attributes></div>');
        this.registerComponent('Glimmer', 'Bar', '<Qux data-from-bar ...attributes />');
        this.registerComponent('Glimmer', 'Foo', '<Bar data-from-foo ...attributes />');
        this.render('<Foo data-from-top />');
        this.assertHTML('<div data-from-qux data-from-bar data-from-foo data-from-top></div>');
    }
}
BasicComponents.suiteName = 'Basic';
__decorate([
    test({
        kind: 'basic',
    })
], BasicComponents.prototype, "creating a new component", null);
__decorate([
    test({
        kind: 'basic',
    })
], BasicComponents.prototype, "creating a new component passing args", null);
__decorate([
    test({
        kind: 'basic',
    })
], BasicComponents.prototype, "creating a new component passing named blocks", null);
__decorate([
    test({
        kind: 'basic',
    })
], BasicComponents.prototype, "creating a new component passing named blocks that take block params", null);
__decorate([
    test({
        kind: 'basic',
    })
], BasicComponents.prototype, "creating a new component passing dynamic args", null);
__decorate([
    test({
        kind: 'basic',
    })
], BasicComponents.prototype, "creating a new component yielding values", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (named arg) via angle brackets", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (named arg path) via angle brackets", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking curried component with attributes via angle brackets (invocation attributes clobber)", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking curried component with attributes via angle brackets (invocation classes merge)", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (named arg) via angle brackets supports attributes (invocation attributes clobber)", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (named arg) via angle brackets supports attributes", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (named arg) via angle brackets supports args", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (named arg) via angle brackets supports passing a block", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (named arg) via angle brackets supports args and attributes", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (local) via angle brackets", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (local path) via angle brackets", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (local) via angle brackets (ill-advised \"htmlish element name\" but supported)", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (local) via angle brackets supports attributes", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (local) via angle brackets supports args", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (local) via angle brackets supports passing a block", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (local) via angle brackets supports args, attributes, and blocks", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (path) via angle brackets", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (path) via angle brackets does not support implicit `this` fallback", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (path) via angle brackets supports attributes", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (path) via angle brackets supports args", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (path) via angle brackets supports passing a block", null);
__decorate([
    test({
        kind: 'glimmer',
    })
], BasicComponents.prototype, "invoking dynamic component (path) via angle brackets supports args, attributes, and blocks", null);
__decorate([
    test({ kind: 'glimmer' })
], BasicComponents.prototype, "angle bracket invocation can pass forward ...attributes to a nested component", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9zdWl0ZXMvY29tcG9uZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFHckQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFNaEQsMEJBQTBCO1FBQ3hCLElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxJQUFJLEVBQUUsYUFBYTtZQUNuQixNQUFNLEVBQUUsd0JBQXdCO1lBQ2hDLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7U0FDekIsRUFDRCxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FDakIsQ0FBQztRQUVGLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFFNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBS0QscUJBQXFCO1FBQ25CLElB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QUM7UUFDSixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDO2lHQVFEO0FBS0Q7SUFIQyxJQUFJLENBQUM7UUFDSixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDO2lKQU9EO0FBS0Q7SUFIQyxJQUFJLENBQUM7UUFDSixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDO2dIQU9EO0FBS0Q7SUFIQyxJQUFJLENBQUM7UUFDSixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDOzBHQU9EO0FBS0Q7SUFIQyxJQUFJLENBQUM7UUFDSixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDO3FIQU9EO0FBS0Q7SUFIQyxJQUFJLENBQUM7UUFDSixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDO2tJQThDRDtBQUtEO0lBSEMsSUFBSSxDQUFDO1FBQ0osSUFBSSxFQUFFLFNBQVM7S0FDaEIsQ0FBQzsyRkFZRDtBQUtEO0lBSEMsSUFBSSxDQUFDO1FBQ0osSUFBSSxFQUFFLFNBQVM7S0FDaEIsQ0FBQztxSUEyQkQ7QUFLRDtJQUhDLElBQUksQ0FBQztRQUNKLElBQUksRUFBRSxTQUFTO0tBQ2hCLENBQUM7K0dBZ0JEO0FBS0Q7SUFIQyxJQUFJLENBQUM7UUFDSixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDO3lHQWdCRDtBQUtEO0lBSEMsSUFBSSxDQUFDO1FBQ0osSUFBSSxFQUFFLFNBQVM7S0FDaEIsQ0FBQztvSEFnQkQ7QUFLRDtJQUhDLElBQUksQ0FBQztRQUNKLElBQUksRUFBRSxTQUFTO0tBQ2hCLENBQUM7aUlBMEREO0FBR0Q7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7b0hBUXpCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUmVuZGVyVGVzdCB9IGZyb20gJy4uL3JlbmRlci10ZXN0JztcbmltcG9ydCB7IHRlc3QgfSBmcm9tICcuLi90ZXN0LWRlY29yYXRvcic7XG5pbXBvcnQgeyBFbWJlcmlzaEdsaW1tZXJDb21wb25lbnQgfSBmcm9tICcuLi9jb21wb25lbnRzJztcbmltcG9ydCB7IHN0cmlwVGlnaHQgfSBmcm9tICcuLi90ZXN0LWhlbHBlcnMvc3RyaW5ncyc7XG5pbXBvcnQgeyBFbWJlcmlzaEdsaW1tZXJBcmdzIH0gZnJvbSAnLi4vY29tcG9uZW50cy9lbWJlcmlzaC1nbGltbWVyJztcblxuZXhwb3J0IGNsYXNzIEZyYWdtZW50Q29tcG9uZW50cyBleHRlbmRzIFJlbmRlclRlc3Qge1xuICBzdGF0aWMgc3VpdGVOYW1lID0gJ0ZyYWdtZW50cyc7XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdmcmFnbWVudCcsXG4gIH0pXG4gICdjcmVhdGluZyBhIG5ldyBjb21wb25lbnQnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBuYW1lOiAnTXlDb21wb25lbnQnLFxuICAgICAgICBsYXlvdXQ6ICd7e3lpZWxkfX0gLSB7e0Bjb2xvcn19JyxcbiAgICAgICAgdGVtcGxhdGU6ICdoZWxsbyEnLFxuICAgICAgICBhcmdzOiB7IGNvbG9yOiAnY29sb3InIH0sXG4gICAgICB9LFxuICAgICAgeyBjb2xvcjogJ3JlZCcgfVxuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoYGhlbGxvISAtIHJlZGApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBjb2xvcjogJ2dyZWVuJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoYGhlbGxvISAtIGdyZWVuYCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGNvbG9yOiAncmVkJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoYGhlbGxvISAtIHJlZGApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZnJhZ21lbnQnLFxuICB9KVxuICAnaW5uZXIgLi4uYXR0cmlidXRlcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdNeUNvbXBvbmVudCcsXG4gICAgICAgIGxheW91dDogJzxkaXY+PHNwYW4gLi4uYXR0cmlidXRlcz57e3lpZWxkfX0gLSB7e0Bjb2xvcn19PC9zcGFuPjwvZGl2PicsXG4gICAgICAgIHRlbXBsYXRlOiAnaGVsbG8hJyxcbiAgICAgICAgYXJnczogeyBjb2xvcjogJ2NvbG9yJyB9LFxuICAgICAgICBhdHRyaWJ1dGVzOiB7IGNvbG9yOiAne3tjb2xvcn19JyB9LFxuICAgICAgfSxcbiAgICAgIHsgY29sb3I6ICdyZWQnIH1cbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRIVE1MKGA8ZGl2PjxzcGFuIGNvbG9yPSdyZWQnPmhlbGxvISAtIHJlZDwvc3Bhbj48L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgY29sb3I6ICdncmVlbicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKGA8ZGl2PjxzcGFuIGNvbG9yPSdncmVlbic+aGVsbG8hIC0gZ3JlZW48L3NwYW4+PC9kaXY+YCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGNvbG9yOiAncmVkJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoYDxkaXY+PHNwYW4gY29sb3I9J3JlZCc+aGVsbG8hIC0gcmVkPC9zcGFuPjwvZGl2PmApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQmFzaWNDb21wb25lbnRzIGV4dGVuZHMgUmVuZGVyVGVzdCB7XG4gIHN0YXRpYyBzdWl0ZU5hbWUgPSAnQmFzaWMnO1xuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnYmFzaWMnLFxuICB9KVxuICAnY3JlYXRpbmcgYSBuZXcgY29tcG9uZW50JygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ015Q29tcG9uZW50JyxcbiAgICAgICAgbGF5b3V0OiAne3t5aWVsZH19JyxcbiAgICAgICAgdGVtcGxhdGU6ICdoZWxsbyEnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7IGNvbG9yOiAne3tjb2xvcn19JyB9LFxuICAgICAgfSxcbiAgICAgIHsgY29sb3I6ICdyZWQnIH1cbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRIVE1MKGA8ZGl2IGNvbG9yPSdyZWQnPmhlbGxvITwvZGl2PmApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBjb2xvcjogJ2dyZWVuJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoYDxkaXYgY29sb3I9J2dyZWVuJz5oZWxsbyE8L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgY29sb3I6ICdyZWQnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGRpdiBjb2xvcj0ncmVkJz5oZWxsbyE8L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2Jhc2ljJyxcbiAgfSlcbiAgJ2NyZWF0aW5nIGEgbmV3IGNvbXBvbmVudCBwYXNzaW5nIGFyZ3MnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBuYW1lOiAnTXlDb21wb25lbnQnLFxuICAgICAgICBsYXlvdXQ6ICd7e0BhcmcxfX17e3lpZWxkfX0nLFxuICAgICAgICB0ZW1wbGF0ZTogJ2hlbGxvIScsXG4gICAgICAgIGFyZ3M6IHsgYXJnMTogXCInaGVsbG8gLSAnXCIgfSxcbiAgICAgICAgYXR0cmlidXRlczogeyBjb2xvcjogJ3t7Y29sb3J9fScgfSxcbiAgICAgIH0sXG4gICAgICB7IGNvbG9yOiAncmVkJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J3JlZCc+aGVsbG8gLSBoZWxsbyE8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGNvbG9yOiAnZ3JlZW4nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J2dyZWVuJz5oZWxsbyAtIGhlbGxvITwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgY29sb3I6ICdyZWQnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J3JlZCc+aGVsbG8gLSBoZWxsbyE8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdiYXNpYycsXG4gIH0pXG4gICdjcmVhdGluZyBhIG5ldyBjb21wb25lbnQgcGFzc2luZyBuYW1lZCBibG9ja3MnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBuYW1lOiAnTXlDb21wb25lbnQnLFxuICAgICAgICBsYXlvdXQ6ICd7e0BhcmcxfX17e3lpZWxkIHRvPVwiaGVsbG9cIn19JyxcbiAgICAgICAgdGVtcGxhdGU6ICc8OmhlbGxvPndvcmxkITwvOmhlbGxvPicsXG4gICAgICAgIGFyZ3M6IHsgYXJnMTogXCInaGVsbG8gLSAnXCIgfSxcbiAgICAgICAgYXR0cmlidXRlczogeyBjb2xvcjogJ3t7Y29sb3J9fScgfSxcbiAgICAgIH0sXG4gICAgICB7IGNvbG9yOiAncmVkJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J3JlZCc+aGVsbG8gLSB3b3JsZCE8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGNvbG9yOiAnZ3JlZW4nIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J2dyZWVuJz5oZWxsbyAtIHdvcmxkITwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgY29sb3I6ICdyZWQnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J3JlZCc+aGVsbG8gLSB3b3JsZCE8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdiYXNpYycsXG4gIH0pXG4gICdjcmVhdGluZyBhIG5ldyBjb21wb25lbnQgcGFzc2luZyBuYW1lZCBibG9ja3MgdGhhdCB0YWtlIGJsb2NrIHBhcmFtcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdNeUNvbXBvbmVudCcsXG4gICAgICAgIGxheW91dDogJ3t7QGFyZzF9fXt7eWllbGQgXCIhXCIgdG89XCJoZWxsb1wifX0nLFxuICAgICAgICB0ZW1wbGF0ZTogJzw6aGVsbG8gYXMgfHB1bmN8Pndvcmxke3twdW5jfX08LzpoZWxsbz4nLFxuICAgICAgICBhcmdzOiB7IGFyZzE6IFwiJ2hlbGxvIC0gJ1wiIH0sXG4gICAgICAgIGF0dHJpYnV0ZXM6IHsgY29sb3I6ICd7e2NvbG9yfX0nIH0sXG4gICAgICB9LFxuICAgICAgeyBjb2xvcjogJ3JlZCcgfVxuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8ZGl2IGNvbG9yPSdyZWQnPmhlbGxvIC0gd29ybGQhPC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBjb2xvcjogJ2dyZWVuJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8ZGl2IGNvbG9yPSdncmVlbic+aGVsbG8gLSB3b3JsZCE8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGNvbG9yOiAncmVkJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8ZGl2IGNvbG9yPSdyZWQnPmhlbGxvIC0gd29ybGQhPC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnYmFzaWMnLFxuICB9KVxuICAnY3JlYXRpbmcgYSBuZXcgY29tcG9uZW50IHBhc3NpbmcgZHluYW1pYyBhcmdzJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ015Q29tcG9uZW50JyxcbiAgICAgICAgbGF5b3V0OiAne3tAYXJnMX19e3t5aWVsZH19JyxcbiAgICAgICAgdGVtcGxhdGU6ICdoZWxsbyEnLFxuICAgICAgICBhcmdzOiB7IGFyZzE6ICdsZWZ0JyB9LFxuICAgICAgICBhdHRyaWJ1dGVzOiB7IGNvbG9yOiAne3tjb2xvcn19JyB9LFxuICAgICAgfSxcbiAgICAgIHsgY29sb3I6ICdyZWQnLCBsZWZ0OiAnbGVmdCAtICcgfVxuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8ZGl2IGNvbG9yPSdyZWQnPmxlZnQgLSBoZWxsbyE8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGNvbG9yOiAnZ3JlZW4nLCBsZWZ0OiAnTEVGVCAtICcgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGRpdiBjb2xvcj0nZ3JlZW4nPkxFRlQgLSBoZWxsbyE8L2Rpdj5cIik7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGNvbG9yOiAncmVkJywgbGVmdDogJ2xlZnQgLSAnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J3JlZCc+bGVmdCAtIGhlbGxvITwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2Jhc2ljJyxcbiAgfSlcbiAgJ2NyZWF0aW5nIGEgbmV3IGNvbXBvbmVudCB5aWVsZGluZyB2YWx1ZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAge1xuICAgICAgICBuYW1lOiAnTXlDb21wb25lbnQnLFxuICAgICAgICBsYXlvdXQ6ICd7e0BhcmcxfX17e3lpZWxkIEB5aWVsZG1lfX0nLFxuICAgICAgICB0ZW1wbGF0ZTogJ2hlbGxvISB7e3lpZWxkZWR9fScsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBbJ3lpZWxkZWQnXSxcbiAgICAgICAgYXJnczogeyBhcmcxOiAnbGVmdCcsIHlpZWxkbWU6IFwiJ3lpZWxkIG1lJ1wiIH0sXG4gICAgICAgIGF0dHJpYnV0ZXM6IHsgY29sb3I6ICd7e2NvbG9yfX0nIH0sXG4gICAgICB9LFxuICAgICAgeyBjb2xvcjogJ3JlZCcsIGxlZnQ6ICdsZWZ0IC0gJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChcIjxkaXYgY29sb3I9J3JlZCc+bGVmdCAtIGhlbGxvISB5aWVsZCBtZTwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgY29sb3I6ICdncmVlbicsIGxlZnQ6ICdMRUZUIC0gJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXCI8ZGl2IGNvbG9yPSdncmVlbic+TEVGVCAtIGhlbGxvISB5aWVsZCBtZTwvZGl2PlwiKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgY29sb3I6ICdyZWQnLCBsZWZ0OiAnbGVmdCAtICcgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFwiPGRpdiBjb2xvcj0ncmVkJz5sZWZ0IC0gaGVsbG8hIHlpZWxkIG1lPC9kaXY+XCIpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAobmFtZWQgYXJnKSB2aWEgYW5nbGUgYnJhY2tldHMnKCkge1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnRm9vJywgJ2hlbGxvIHdvcmxkIScpO1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxAZm9vIC8+JyxcbiAgICAgIGFyZ3M6IHtcbiAgICAgICAgZm9vOiAnY29tcG9uZW50IFwiRm9vXCInLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGRpdj5oZWxsbyB3b3JsZCE8L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgZHluYW1pYyBjb21wb25lbnQgKG5hbWVkIGFyZyBwYXRoKSB2aWEgYW5nbGUgYnJhY2tldHMnKCkge1xuICAgIHRoaXMucmVnaXN0ZXJIZWxwZXIoJ2hhc2gnLCAoX3Bvc2l0aW9uYWwsIG5hbWVkKSA9PiBuYW1lZCk7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnaGVsbG8gd29ybGQhJyk7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPEBzdHVmZi5Gb28gLz4nLFxuICAgICAgYXJnczoge1xuICAgICAgICBzdHVmZjogJ2hhc2ggRm9vPShjb21wb25lbnQgXCJGb29cIiknLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGRpdj5oZWxsbyB3b3JsZCE8L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgY3VycmllZCBjb21wb25lbnQgd2l0aCBhdHRyaWJ1dGVzIHZpYSBhbmdsZSBicmFja2V0cyAoaW52b2NhdGlvbiBhdHRyaWJ1dGVzIGNsb2JiZXIpJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCdoYXNoJywgKF9wb3NpdGlvbmFsLCBuYW1lZCkgPT4gbmFtZWQpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoXG4gICAgICAnR2xpbW1lcicsXG4gICAgICAnRm9vJyxcbiAgICAgICc8cCBkYXRhLWZvbz1cImRlZmF1bHRcIiAuLi5hdHRyaWJ1dGVzPmhlbGxvIHdvcmxkITwvcD4nXG4gICAgKTtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8QHN0dWZmLkZvbyBkYXRhLWZvbz1cImludm9jYXRpb25cIiAvPicsXG4gICAgICBhcmdzOiB7XG4gICAgICAgIHN0dWZmOiAnaGFzaCBGb289KGNvbXBvbmVudCBcIkZvb1wiKScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRIVE1MKGA8ZGl2PjxwIGRhdGEtZm9vPVwiaW52b2NhdGlvblwiPmhlbGxvIHdvcmxkITwvcD48L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgY3VycmllZCBjb21wb25lbnQgd2l0aCBhdHRyaWJ1dGVzIHZpYSBhbmdsZSBicmFja2V0cyAoaW52b2NhdGlvbiBjbGFzc2VzIG1lcmdlKScoKSB7XG4gICAgdGhpcy5yZWdpc3RlckhlbHBlcignaGFzaCcsIChfcG9zaXRpb25hbCwgbmFtZWQpID0+IG5hbWVkKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0ZvbycsICc8cCBjbGFzcz1cImRlZmF1bHRcIiAuLi5hdHRyaWJ1dGVzPmhlbGxvIHdvcmxkITwvcD4nKTtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8QHN0dWZmLkZvbyBjbGFzcz1cImludm9jYXRpb25cIiAvPicsXG4gICAgICBhcmdzOiB7XG4gICAgICAgIHN0dWZmOiAnaGFzaCBGb289KGNvbXBvbmVudCBcIkZvb1wiKScsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRIVE1MKGA8ZGl2PjxwIGNsYXNzPVwiZGVmYXVsdCBpbnZvY2F0aW9uXCI+aGVsbG8gd29ybGQhPC9wPjwvZGl2PmApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAobmFtZWQgYXJnKSB2aWEgYW5nbGUgYnJhY2tldHMgc3VwcG9ydHMgYXR0cmlidXRlcyAoaW52b2NhdGlvbiBhdHRyaWJ1dGVzIGNsb2JiZXIpJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KFxuICAgICAgJ0dsaW1tZXInLFxuICAgICAgJ0ZvbycsXG4gICAgICAnPGRpdiBkYXRhLXRlc3Q9XCJkZWZhdWx0XCIgLi4uYXR0cmlidXRlcz5oZWxsbyB3b3JsZCE8L2Rpdj4nXG4gICAgKTtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICc8QGZvbyBkYXRhLXRlc3Q9XCJmb29cIi8+JyxcbiAgICAgIGFyZ3M6IHtcbiAgICAgICAgZm9vOiAnY29tcG9uZW50IFwiRm9vXCInLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGRpdj48ZGl2IGRhdGEtdGVzdD1cImZvb1wiPmhlbGxvIHdvcmxkITwvZGl2PjwvZGl2PmApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAobmFtZWQgYXJnKSB2aWEgYW5nbGUgYnJhY2tldHMgc3VwcG9ydHMgYXR0cmlidXRlcycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnPGRpdiAuLi5hdHRyaWJ1dGVzPmhlbGxvIHdvcmxkITwvZGl2PicpO1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxAZm9vIGRhdGEtdGVzdD1cImZvb1wiLz4nLFxuICAgICAgYXJnczoge1xuICAgICAgICBmb286ICdjb21wb25lbnQgXCJGb29cIicsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRIVE1MKGA8ZGl2PjxkaXYgZGF0YS10ZXN0PVwiZm9vXCI+aGVsbG8gd29ybGQhPC9kaXY+PC9kaXY+YCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdnbGltbWVyJyxcbiAgfSlcbiAgJ2ludm9raW5nIGR5bmFtaWMgY29tcG9uZW50IChuYW1lZCBhcmcpIHZpYSBhbmdsZSBicmFja2V0cyBzdXBwb3J0cyBhcmdzJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0ZvbycsICdoZWxsbyB7e0BuYW1lfX0hJyk7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnPEBmb28gQG5hbWU9XCJ3b3JsZFwiIC8+JyxcbiAgICAgIGFyZ3M6IHtcbiAgICAgICAgZm9vOiAnY29tcG9uZW50IFwiRm9vXCInLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGRpdj5oZWxsbyB3b3JsZCE8L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgZHluYW1pYyBjb21wb25lbnQgKG5hbWVkIGFyZykgdmlhIGFuZ2xlIGJyYWNrZXRzIHN1cHBvcnRzIHBhc3NpbmcgYSBibG9jaycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnaGVsbG8ge3t5aWVsZH19IScpO1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJzxAZm9vPndvcmxkPC9AZm9vPicsXG4gICAgICBhcmdzOiB7XG4gICAgICAgIGZvbzogJ2NvbXBvbmVudCBcIkZvb1wiJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoYDxkaXY+aGVsbG8gd29ybGQhPC9kaXY+YCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdnbGltbWVyJyxcbiAgfSlcbiAgJ2ludm9raW5nIGR5bmFtaWMgY29tcG9uZW50IChuYW1lZCBhcmcpIHZpYSBhbmdsZSBicmFja2V0cyBzdXBwb3J0cyBhcmdzIGFuZCBhdHRyaWJ1dGVzJygpIHtcbiAgICBsZXQgaW5zdGFuY2U6IEZvbztcbiAgICBjbGFzcyBGb28gZXh0ZW5kcyBFbWJlcmlzaEdsaW1tZXJDb21wb25lbnQge1xuICAgICAgcHVibGljIGxvY2FsUHJvcGVydHk6IHN0cmluZztcblxuICAgICAgY29uc3RydWN0b3IoYXJnczogRW1iZXJpc2hHbGltbWVyQXJncykge1xuICAgICAgICBzdXBlcihhcmdzKTtcbiAgICAgICAgaW5zdGFuY2UgPSB0aGlzO1xuICAgICAgICB0aGlzLmxvY2FsUHJvcGVydHkgPSAnbG9jYWwnO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KFxuICAgICAgJ0dsaW1tZXInLFxuICAgICAgJ0ZvbycsXG4gICAgICAnPGRpdiAuLi5hdHRyaWJ1dGVzPlt7e2xvY2FsUHJvcGVydHl9fSB7e0BzdGF0aWNOYW1lZEFyZ319IHt7QGR5bmFtaWNOYW1lZEFyZ319XTwvZGl2PicsXG4gICAgICBGb29cbiAgICApO1xuXG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIGxheW91dDogc3RyaXBUaWdodGA8QGZvbyBAc3RhdGljTmFtZWRBcmc9XCJzdGF0aWNcIiBkYXRhLXRlc3QxPXt7QG91dGVyQXJnfX0gZGF0YS10ZXN0Mj1cInN0YXRpY1wiIEBkeW5hbWljTmFtZWRBcmc9e3tAb3V0ZXJBcmd9fSAvPmAsXG4gICAgICAgIGFyZ3M6IHtcbiAgICAgICAgICBmb286ICdjb21wb25lbnQgXCJGb29cIicsXG4gICAgICAgICAgb3V0ZXJBcmc6ICdvdXRlcicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgeyBvdXRlcjogJ291dGVyJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChcbiAgICAgIGA8ZGl2PjxkaXYgZGF0YS10ZXN0MT1cIm91dGVyXCIgZGF0YS10ZXN0Mj1cInN0YXRpY1wiPltsb2NhbCBzdGF0aWMgb3V0ZXJdPC9kaXY+PC9kaXY+YFxuICAgICk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IG91dGVyOiAnT1VURVInIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcbiAgICAgIGA8ZGl2PjxkaXYgZGF0YS10ZXN0MT1cIk9VVEVSXCIgZGF0YS10ZXN0Mj1cInN0YXRpY1wiPltsb2NhbCBzdGF0aWMgT1VURVJdPC9kaXY+PC9kaXY+YFxuICAgICk7XG5cbiAgICBpbnN0YW5jZSEubG9jYWxQcm9wZXJ0eSA9ICdMT0NBTCc7XG4gICAgaW5zdGFuY2UhLnJlY29tcHV0ZSgpO1xuICAgIHRoaXMucmVyZW5kZXIoKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXG4gICAgICBgPGRpdj48ZGl2IGRhdGEtdGVzdDE9XCJPVVRFUlwiIGRhdGEtdGVzdDI9XCJzdGF0aWNcIj5bTE9DQUwgc3RhdGljIE9VVEVSXTwvZGl2PjwvZGl2PmBcbiAgICApO1xuXG4gICAgaW5zdGFuY2UhLmxvY2FsUHJvcGVydHkgPSAnbG9jYWwnO1xuICAgIGluc3RhbmNlIS5yZWNvbXB1dGUoKTtcbiAgICB0aGlzLnJlcmVuZGVyKHsgb3V0ZXI6ICdvdXRlcicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgYDxkaXY+PGRpdiBkYXRhLXRlc3QxPVwib3V0ZXJcIiBkYXRhLXRlc3QyPVwic3RhdGljXCI+W2xvY2FsIHN0YXRpYyBvdXRlcl08L2Rpdj48L2Rpdj5gXG4gICAgKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAobG9jYWwpIHZpYSBhbmdsZSBicmFja2V0cycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnaGVsbG8gd29ybGQhJyk7XG4gICAgdGhpcy5yZW5kZXIoYHt7I3dpdGggKGNvbXBvbmVudCAnRm9vJykgYXMgfE90aGVyfH19PE90aGVyIC8+e3svd2l0aH19YCk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoYGhlbGxvIHdvcmxkIWApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAobG9jYWwgcGF0aCkgdmlhIGFuZ2xlIGJyYWNrZXRzJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVySGVscGVyKCdoYXNoJywgKF9wb3NpdGlvbmFsLCBuYW1lZCkgPT4gbmFtZWQpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnRm9vJywgJ2hlbGxvIHdvcmxkIScpO1xuICAgIHRoaXMucmVuZGVyKGB7eyN3aXRoIChoYXNoIEZvbz0oY29tcG9uZW50ICdGb28nKSkgYXMgfE90aGVyfH19PE90aGVyLkZvbyAvPnt7L3dpdGh9fWApO1xuXG4gICAgdGhpcy5hc3NlcnRIVE1MKGBoZWxsbyB3b3JsZCFgKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgZHluYW1pYyBjb21wb25lbnQgKGxvY2FsKSB2aWEgYW5nbGUgYnJhY2tldHMgKGlsbC1hZHZpc2VkIFwiaHRtbGlzaCBlbGVtZW50IG5hbWVcIiBidXQgc3VwcG9ydGVkKScoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnaGVsbG8gd29ybGQhJyk7XG4gICAgdGhpcy5yZW5kZXIoYHt7I3dpdGggKGNvbXBvbmVudCAnRm9vJykgYXMgfGRpdnx9fTxkaXYgLz57ey93aXRofX1gKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgaGVsbG8gd29ybGQhYCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdnbGltbWVyJyxcbiAgfSlcbiAgJ2ludm9raW5nIGR5bmFtaWMgY29tcG9uZW50IChsb2NhbCkgdmlhIGFuZ2xlIGJyYWNrZXRzIHN1cHBvcnRzIGF0dHJpYnV0ZXMnKCkge1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnRm9vJywgJzxkaXYgLi4uYXR0cmlidXRlcz5oZWxsbyB3b3JsZCE8L2Rpdj4nKTtcbiAgICB0aGlzLnJlbmRlcihge3sjd2l0aCAoY29tcG9uZW50ICdGb28nKSBhcyB8T3RoZXJ8fX08T3RoZXIgZGF0YS10ZXN0PVwiZm9vXCIgLz57ey93aXRofX1gKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGRpdiBkYXRhLXRlc3Q9XCJmb29cIj5oZWxsbyB3b3JsZCE8L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgZHluYW1pYyBjb21wb25lbnQgKGxvY2FsKSB2aWEgYW5nbGUgYnJhY2tldHMgc3VwcG9ydHMgYXJncycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnaGVsbG8ge3tAbmFtZX19IScpO1xuICAgIHRoaXMucmVuZGVyKGB7eyN3aXRoIChjb21wb25lbnQgJ0ZvbycpIGFzIHxPdGhlcnx9fTxPdGhlciBAbmFtZT1cIndvcmxkXCIgLz57ey93aXRofX1gKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgaGVsbG8gd29ybGQhYCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdnbGltbWVyJyxcbiAgfSlcbiAgJ2ludm9raW5nIGR5bmFtaWMgY29tcG9uZW50IChsb2NhbCkgdmlhIGFuZ2xlIGJyYWNrZXRzIHN1cHBvcnRzIHBhc3NpbmcgYSBibG9jaycoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnaGVsbG8ge3t5aWVsZH19IScpO1xuICAgIHRoaXMucmVuZGVyKGB7eyN3aXRoIChjb21wb25lbnQgJ0ZvbycpIGFzIHxPdGhlcnx9fTxPdGhlcj53b3JsZDwvT3RoZXI+e3svd2l0aH19YCk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoYGhlbGxvIHdvcmxkIWApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAobG9jYWwpIHZpYSBhbmdsZSBicmFja2V0cyBzdXBwb3J0cyBhcmdzLCBhdHRyaWJ1dGVzLCBhbmQgYmxvY2tzJygpIHtcbiAgICBsZXQgaW5zdGFuY2U6IEZvbztcbiAgICBjbGFzcyBGb28gZXh0ZW5kcyBFbWJlcmlzaEdsaW1tZXJDb21wb25lbnQge1xuICAgICAgcHVibGljIGxvY2FsUHJvcGVydHk6IHN0cmluZztcblxuICAgICAgY29uc3RydWN0b3IoYXJnczogRW1iZXJpc2hHbGltbWVyQXJncykge1xuICAgICAgICBzdXBlcihhcmdzKTtcbiAgICAgICAgaW5zdGFuY2UgPSB0aGlzO1xuICAgICAgICB0aGlzLmxvY2FsUHJvcGVydHkgPSAnbG9jYWwnO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KFxuICAgICAgJ0dsaW1tZXInLFxuICAgICAgJ0ZvbycsXG4gICAgICAnPGRpdiAuLi5hdHRyaWJ1dGVzPlt7e2xvY2FsUHJvcGVydHl9fSB7e0BzdGF0aWNOYW1lZEFyZ319IHt7QGR5bmFtaWNOYW1lZEFyZ319XSAtIHt7eWllbGR9fTwvZGl2PicsXG4gICAgICBGb29cbiAgICApO1xuICAgIHRoaXMucmVuZGVyKFxuICAgICAgYHt7I3dpdGggKGNvbXBvbmVudCAnRm9vJykgYXMgfE90aGVyfH19PE90aGVyIEBzdGF0aWNOYW1lZEFyZz1cInN0YXRpY1wiIGRhdGEtdGVzdDE9e3tvdXRlcn19IGRhdGEtdGVzdDI9XCJzdGF0aWNcIiBAZHluYW1pY05hbWVkQXJnPXt7b3V0ZXJ9fT50ZW1wbGF0ZTwvT3RoZXI+e3svd2l0aH19YCxcbiAgICAgIHsgb3V0ZXI6ICdvdXRlcicgfVxuICAgICk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoXG4gICAgICBgPGRpdiBkYXRhLXRlc3QxPVwib3V0ZXJcIiBkYXRhLXRlc3QyPVwic3RhdGljXCI+W2xvY2FsIHN0YXRpYyBvdXRlcl0gLSB0ZW1wbGF0ZTwvZGl2PmBcbiAgICApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBvdXRlcjogJ09VVEVSJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXG4gICAgICBgPGRpdiBkYXRhLXRlc3QxPVwiT1VURVJcIiBkYXRhLXRlc3QyPVwic3RhdGljXCI+W2xvY2FsIHN0YXRpYyBPVVRFUl0gLSB0ZW1wbGF0ZTwvZGl2PmBcbiAgICApO1xuXG4gICAgaW5zdGFuY2UhLmxvY2FsUHJvcGVydHkgPSAnTE9DQUwnO1xuICAgIGluc3RhbmNlIS5yZWNvbXB1dGUoKTtcbiAgICB0aGlzLnJlcmVuZGVyKCk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgYDxkaXYgZGF0YS10ZXN0MT1cIk9VVEVSXCIgZGF0YS10ZXN0Mj1cInN0YXRpY1wiPltMT0NBTCBzdGF0aWMgT1VURVJdIC0gdGVtcGxhdGU8L2Rpdj5gXG4gICAgKTtcblxuICAgIGluc3RhbmNlIS5sb2NhbFByb3BlcnR5ID0gJ2xvY2FsJztcbiAgICBpbnN0YW5jZSEucmVjb21wdXRlKCk7XG4gICAgdGhpcy5yZXJlbmRlcih7IG91dGVyOiAnb3V0ZXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcbiAgICAgIGA8ZGl2IGRhdGEtdGVzdDE9XCJvdXRlclwiIGRhdGEtdGVzdDI9XCJzdGF0aWNcIj5bbG9jYWwgc3RhdGljIG91dGVyXSAtIHRlbXBsYXRlPC9kaXY+YFxuICAgICk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgZHluYW1pYyBjb21wb25lbnQgKHBhdGgpIHZpYSBhbmdsZSBicmFja2V0cycoKSB7XG4gICAgY2xhc3MgVGVzdEhhcm5lc3MgZXh0ZW5kcyBFbWJlcmlzaEdsaW1tZXJDb21wb25lbnQge1xuICAgICAgcHVibGljIEZvbzogYW55O1xuICAgIH1cbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ1Rlc3RIYXJuZXNzJywgJzx0aGlzLkZvbyAvPicsIFRlc3RIYXJuZXNzKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0ZvbycsICdoZWxsbyB3b3JsZCEnKTtcblxuICAgIHRoaXMucmVuZGVyKCc8VGVzdEhhcm5lc3MgQEZvbz17e2NvbXBvbmVudCBcIkZvb1wifX0gLz4nKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgaGVsbG8gd29ybGQhYCk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3Qoe1xuICAgIGtpbmQ6ICdnbGltbWVyJyxcbiAgfSlcbiAgJ2ludm9raW5nIGR5bmFtaWMgY29tcG9uZW50IChwYXRoKSB2aWEgYW5nbGUgYnJhY2tldHMgZG9lcyBub3Qgc3VwcG9ydCBpbXBsaWNpdCBgdGhpc2AgZmFsbGJhY2snKCkge1xuICAgIGNsYXNzIFRlc3RIYXJuZXNzIGV4dGVuZHMgRW1iZXJpc2hHbGltbWVyQ29tcG9uZW50IHtcbiAgICAgIHB1YmxpYyBzdHVmZjogYW55O1xuXG4gICAgICBjb25zdHJ1Y3RvcihhcmdzOiBFbWJlcmlzaEdsaW1tZXJBcmdzKSB7XG4gICAgICAgIHN1cGVyKGFyZ3MpO1xuICAgICAgICB0aGlzLnN0dWZmID0ge1xuICAgICAgICAgIEZvbzogYXJncy5hdHRycy5Gb28sXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnVGVzdEhhcm5lc3MnLCAnPHN0dWZmLkZvbyAvPicsIFRlc3RIYXJuZXNzKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KFxuICAgICAgJ0dsaW1tZXInLFxuICAgICAgJ0ZvbycsXG4gICAgICAnaGVsbG8gd29ybGQhJyxcbiAgICAgIGNsYXNzIGV4dGVuZHMgRW1iZXJpc2hHbGltbWVyQ29tcG9uZW50IHtcbiAgICAgICAgY29uc3RydWN0b3IoYXJnczogRW1iZXJpc2hHbGltbWVyQXJncykge1xuICAgICAgICAgIHN1cGVyKGFyZ3MpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2hvdWxkIG5vdCBoYXZlIGluc3RhbnRpYXRlZCBGb28gY29tcG9uZW50LicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMucmVuZGVyKCc8VGVzdEhhcm5lc3MgQEZvbz17e2NvbXBvbmVudCBcIkZvb1wifX0gLz4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgZHluYW1pYyBjb21wb25lbnQgKHBhdGgpIHZpYSBhbmdsZSBicmFja2V0cyBzdXBwb3J0cyBhdHRyaWJ1dGVzJygpIHtcbiAgICBjbGFzcyBUZXN0SGFybmVzcyBleHRlbmRzIEVtYmVyaXNoR2xpbW1lckNvbXBvbmVudCB7XG4gICAgICBwdWJsaWMgRm9vOiBhbnk7XG5cbiAgICAgIGNvbnN0cnVjdG9yKGFyZ3M6IEVtYmVyaXNoR2xpbW1lckFyZ3MpIHtcbiAgICAgICAgc3VwZXIoYXJncyk7XG4gICAgICAgIHRoaXMuRm9vID0gYXJncy5hdHRycy5Gb287XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnVGVzdEhhcm5lc3MnLCAnPHRoaXMuRm9vIGRhdGEtdGVzdD1cImZvb1wiLz4nLCBUZXN0SGFybmVzcyk7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdGb28nLCAnPGRpdiAuLi5hdHRyaWJ1dGVzPmhlbGxvIHdvcmxkITwvZGl2PicpO1xuICAgIHRoaXMucmVuZGVyKCc8VGVzdEhhcm5lc3MgQEZvbz17e2NvbXBvbmVudCBcIkZvb1wifX0gLz4nKTtcblxuICAgIHRoaXMuYXNzZXJ0SFRNTChgPGRpdiBkYXRhLXRlc3Q9XCJmb29cIj5oZWxsbyB3b3JsZCE8L2Rpdj5gKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7XG4gICAga2luZDogJ2dsaW1tZXInLFxuICB9KVxuICAnaW52b2tpbmcgZHluYW1pYyBjb21wb25lbnQgKHBhdGgpIHZpYSBhbmdsZSBicmFja2V0cyBzdXBwb3J0cyBhcmdzJygpIHtcbiAgICBjbGFzcyBUZXN0SGFybmVzcyBleHRlbmRzIEVtYmVyaXNoR2xpbW1lckNvbXBvbmVudCB7XG4gICAgICBwdWJsaWMgRm9vOiBhbnk7XG5cbiAgICAgIGNvbnN0cnVjdG9yKGFyZ3M6IEVtYmVyaXNoR2xpbW1lckFyZ3MpIHtcbiAgICAgICAgc3VwZXIoYXJncyk7XG4gICAgICAgIHRoaXMuRm9vID0gYXJncy5hdHRycy5Gb287XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnVGVzdEhhcm5lc3MnLCAnPHRoaXMuRm9vIEBuYW1lPVwid29ybGRcIi8+JywgVGVzdEhhcm5lc3MpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnRm9vJywgJ2hlbGxvIHt7QG5hbWV9fSEnKTtcbiAgICB0aGlzLnJlbmRlcignPFRlc3RIYXJuZXNzIEBGb289e3tjb21wb25lbnQgXCJGb29cIn19IC8+Jyk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoYGhlbGxvIHdvcmxkIWApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAocGF0aCkgdmlhIGFuZ2xlIGJyYWNrZXRzIHN1cHBvcnRzIHBhc3NpbmcgYSBibG9jaycoKSB7XG4gICAgY2xhc3MgVGVzdEhhcm5lc3MgZXh0ZW5kcyBFbWJlcmlzaEdsaW1tZXJDb21wb25lbnQge1xuICAgICAgcHVibGljIEZvbzogYW55O1xuXG4gICAgICBjb25zdHJ1Y3RvcihhcmdzOiBFbWJlcmlzaEdsaW1tZXJBcmdzKSB7XG4gICAgICAgIHN1cGVyKGFyZ3MpO1xuICAgICAgICB0aGlzLkZvbyA9IGFyZ3MuYXR0cnMuRm9vO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ1Rlc3RIYXJuZXNzJywgJzx0aGlzLkZvbz53b3JsZDwvdGhpcy5Gb28+JywgVGVzdEhhcm5lc3MpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnRm9vJywgJ2hlbGxvIHt7eWllbGR9fSEnKTtcbiAgICB0aGlzLnJlbmRlcignPFRlc3RIYXJuZXNzIEBGb289e3tjb21wb25lbnQgXCJGb29cIn19IC8+Jyk7XG5cbiAgICB0aGlzLmFzc2VydEhUTUwoYGhlbGxvIHdvcmxkIWApO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHtcbiAgICBraW5kOiAnZ2xpbW1lcicsXG4gIH0pXG4gICdpbnZva2luZyBkeW5hbWljIGNvbXBvbmVudCAocGF0aCkgdmlhIGFuZ2xlIGJyYWNrZXRzIHN1cHBvcnRzIGFyZ3MsIGF0dHJpYnV0ZXMsIGFuZCBibG9ja3MnKCkge1xuICAgIGxldCBpbnN0YW5jZTogRm9vO1xuICAgIGNsYXNzIFRlc3RIYXJuZXNzIGV4dGVuZHMgRW1iZXJpc2hHbGltbWVyQ29tcG9uZW50IHtcbiAgICAgIHB1YmxpYyBGb286IGFueTtcblxuICAgICAgY29uc3RydWN0b3IoYXJnczogRW1iZXJpc2hHbGltbWVyQXJncykge1xuICAgICAgICBzdXBlcihhcmdzKTtcbiAgICAgICAgdGhpcy5Gb28gPSBhcmdzLmF0dHJzLkZvbztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjbGFzcyBGb28gZXh0ZW5kcyBFbWJlcmlzaEdsaW1tZXJDb21wb25lbnQge1xuICAgICAgcHVibGljIGxvY2FsUHJvcGVydHk6IHN0cmluZztcblxuICAgICAgY29uc3RydWN0b3IoYXJnczogRW1iZXJpc2hHbGltbWVyQXJncykge1xuICAgICAgICBzdXBlcihhcmdzKTtcbiAgICAgICAgaW5zdGFuY2UgPSB0aGlzO1xuICAgICAgICB0aGlzLmxvY2FsUHJvcGVydHkgPSAnbG9jYWwnO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KFxuICAgICAgJ0dsaW1tZXInLFxuICAgICAgJ1Rlc3RIYXJuZXNzJyxcbiAgICAgICc8dGhpcy5Gb28gQHN0YXRpY05hbWVkQXJnPVwic3RhdGljXCIgZGF0YS10ZXN0MT17e0BvdXRlcn19IGRhdGEtdGVzdDI9XCJzdGF0aWNcIiBAZHluYW1pY05hbWVkQXJnPXt7QG91dGVyfX0+dGVtcGxhdGU8L3RoaXMuRm9vPicsXG4gICAgICBUZXN0SGFybmVzc1xuICAgICk7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudChcbiAgICAgICdHbGltbWVyJyxcbiAgICAgICdGb28nLFxuICAgICAgJzxkaXYgLi4uYXR0cmlidXRlcz5be3tsb2NhbFByb3BlcnR5fX0ge3tAc3RhdGljTmFtZWRBcmd9fSB7e0BkeW5hbWljTmFtZWRBcmd9fV0gLSB7e3lpZWxkfX08L2Rpdj4nLFxuICAgICAgRm9vXG4gICAgKTtcbiAgICB0aGlzLnJlbmRlcignPFRlc3RIYXJuZXNzIEBvdXRlcj17e291dGVyfX0gQEZvbz17e2NvbXBvbmVudCBcIkZvb1wifX0gLz4nLCB7IG91dGVyOiAnb3V0ZXInIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgYDxkaXYgZGF0YS10ZXN0MT1cIm91dGVyXCIgZGF0YS10ZXN0Mj1cInN0YXRpY1wiPltsb2NhbCBzdGF0aWMgb3V0ZXJdIC0gdGVtcGxhdGU8L2Rpdj5gXG4gICAgKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgb3V0ZXI6ICdPVVRFUicgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKFxuICAgICAgYDxkaXYgZGF0YS10ZXN0MT1cIk9VVEVSXCIgZGF0YS10ZXN0Mj1cInN0YXRpY1wiPltsb2NhbCBzdGF0aWMgT1VURVJdIC0gdGVtcGxhdGU8L2Rpdj5gXG4gICAgKTtcblxuICAgIGluc3RhbmNlIS5sb2NhbFByb3BlcnR5ID0gJ0xPQ0FMJztcbiAgICBpbnN0YW5jZSEucmVjb21wdXRlKCk7XG4gICAgdGhpcy5yZXJlbmRlcigpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTChcbiAgICAgIGA8ZGl2IGRhdGEtdGVzdDE9XCJPVVRFUlwiIGRhdGEtdGVzdDI9XCJzdGF0aWNcIj5bTE9DQUwgc3RhdGljIE9VVEVSXSAtIHRlbXBsYXRlPC9kaXY+YFxuICAgICk7XG5cbiAgICBpbnN0YW5jZSEubG9jYWxQcm9wZXJ0eSA9ICdsb2NhbCc7XG4gICAgaW5zdGFuY2UhLnJlY29tcHV0ZSgpO1xuICAgIHRoaXMucmVyZW5kZXIoeyBvdXRlcjogJ291dGVyJyB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoXG4gICAgICBgPGRpdiBkYXRhLXRlc3QxPVwib3V0ZXJcIiBkYXRhLXRlc3QyPVwic3RhdGljXCI+W2xvY2FsIHN0YXRpYyBvdXRlcl0gLSB0ZW1wbGF0ZTwvZGl2PmBcbiAgICApO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnZ2xpbW1lcicgfSlcbiAgJ2FuZ2xlIGJyYWNrZXQgaW52b2NhdGlvbiBjYW4gcGFzcyBmb3J3YXJkIC4uLmF0dHJpYnV0ZXMgdG8gYSBuZXN0ZWQgY29tcG9uZW50JygpIHtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ1F1eCcsICc8ZGl2IGRhdGEtZnJvbS1xdXggLi4uYXR0cmlidXRlcz48L2Rpdj4nKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0JhcicsICc8UXV4IGRhdGEtZnJvbS1iYXIgLi4uYXR0cmlidXRlcyAvPicpO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnRm9vJywgJzxCYXIgZGF0YS1mcm9tLWZvbyAuLi5hdHRyaWJ1dGVzIC8+Jyk7XG5cbiAgICB0aGlzLnJlbmRlcignPEZvbyBkYXRhLWZyb20tdG9wIC8+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2IGRhdGEtZnJvbS1xdXggZGF0YS1mcm9tLWJhciBkYXRhLWZyb20tZm9vIGRhdGEtZnJvbS10b3A+PC9kaXY+Jyk7XG4gIH1cbn1cbiJdfQ==