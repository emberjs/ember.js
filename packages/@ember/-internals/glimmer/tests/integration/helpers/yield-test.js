import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import { Component } from '../../utils/helpers';

moduleFor(
  'Helpers test: {{yield}} helper',
  class extends RenderingTestCase {
    ['@test can yield to a default block']() {
      this.owner.register(
        'component:yield-comp',
        setComponentTemplate(
          precompileTemplate('[In layout:] {{yield}}'),
          class extends Component {}
        )
      );

      this.render('{{#yield-comp}}[In Block:] {{this.object.title}}{{/yield-comp}}', {
        object: { title: 'Seattle' },
      });
      this.assertText('[In layout:] [In Block:] Seattle');

      this.assertStableRerender();

      runTask(() => set(this.context, 'object.title', 'Vancouver'));
      this.assertText('[In layout:] [In Block:] Vancouver');

      runTask(() => set(this.context, 'object', { title: 'Seattle' }));
      this.assertText('[In layout:] [In Block:] Seattle');
    }

    ['@test can yield to a named block']() {
      // This test fails when the default Ember component backing class is used:
      this.owner.register(
        'component:yield-comp',
        setComponentTemplate(
          precompileTemplate('[In layout:] {{yield to="block"}}'),
          class extends Component {}
        )
      );

      this.render('<YieldComp><:block>[In block:] {{this.object.title}}</:block></YieldComp>', {
        object: { title: 'Seattle' },
      });

      this.assertText('[In layout:] [In block:] Seattle');

      this.assertStableRerender();

      runTask(() => set(this.context, 'object.title', 'Vancouver'));
      this.assertText('[In layout:] [In block:] Vancouver');

      runTask(() => set(this.context, 'object', { title: 'Seattle' }));
      this.assertText('[In layout:] [In block:] Seattle');
    }

    ['@test <:else> and <:inverse> named blocks']() {
      this.owner.register(
        'component:yielder',
        setComponentTemplate(
          precompileTemplate(
            '[:else][{{has-block "else"}}][{{yield to="else"}}][:inverse][{{has-block "inverse"}}][{{yield to="inverse"}}]'
          ),
          class extends Component {}
        )
      );

      this.render(
        '[<Yielder />]' +
          '[<Yielder><:else>Hello</:else></Yielder>]' +
          '[<Yielder><:inverse>Goodbye</:inverse></Yielder>]'
      );

      this.assertText(
        '[[:else][false][][:inverse][false][]]' +
          '[[:else][true][Hello][:inverse][true][Hello]]' +
          '[[:else][true][Goodbye][:inverse][true][Goodbye]]'
      );

      this.assertStableRerender();
    }

    ['@test templates should yield to block inside a nested component']() {
      this.owner.register(
        'component:outer-comp',
        setComponentTemplate(
          precompileTemplate('<div>[In layout:] {{yield}}</div>'),
          class extends Component {}
        )
      );
      this.owner.register(
        'component:inner-comp',
        setComponentTemplate(
          precompileTemplate('{{#outer-comp}}[In Block:] {{this.object.title}}{{/outer-comp}}'),
          class extends Component {}
        )
      );

      this.render('{{inner-comp object=this.object}}', {
        object: { title: 'Seattle' },
      });
      this.assertText('[In layout:] [In Block:] Seattle');

      this.assertStableRerender();

      runTask(() => set(this.context, 'object.title', 'Vancouver'));
      this.assertText('[In layout:] [In Block:] Vancouver');

      runTask(() => set(this.context, 'object', { title: 'Seattle' }));
      this.assertText('[In layout:] [In Block:] Seattle');
    }

    ['@test templates should yield to block, when the yield is embedded in a each helper']() {
      let list = [1, 2, 3];

      this.owner.register(
        'component:outer-comp',
        setComponentTemplate(
          precompileTemplate('{{#each this.list as |item|}}{{yield}}{{/each}}'),
          class extends Component {}
        )
      );

      this.render('{{#outer-comp list=this.list}}Hello{{/outer-comp}}', {
        list: list,
      });
      this.assertText('HelloHelloHello');

      this.assertStableRerender();

      runTask(() => set(this.context, 'list', [4, 5]));
      this.assertText('HelloHello');

      runTask(() => set(this.context, 'list', list));
      this.assertText('HelloHelloHello');
    }

    ['@test templates should yield to block, when the yield is embedded in a if helper']() {
      this.owner.register(
        'component:outer-comp',
        setComponentTemplate(
          precompileTemplate('{{#if this.boolean}}{{yield}}{{/if}}'),
          class extends Component {}
        )
      );

      this.render('{{#outer-comp boolean=this.boolean}}Hello{{/outer-comp}}', {
        boolean: true,
      });
      this.assertText('Hello');

      this.assertStableRerender();

      runTask(() => set(this.context, 'boolean', false));
      this.assertText('');

      runTask(() => set(this.context, 'boolean', true));
      this.assertText('Hello');
    }

    ['@test simple curlies inside of a yielded block should work when the yield is nested inside of another view']() {
      this.owner.register(
        'component:kiwi-comp',
        setComponentTemplate(
          precompileTemplate('{{#if this.falsy}}{{else}}{{yield}}{{/if}}'),
          class extends Component {}
        )
      );

      this.render('{{#kiwi-comp}}{{this.text}}{{/kiwi-comp}}', { text: 'ohai' });
      this.assertText('ohai');

      this.assertStableRerender();

      runTask(() => set(this.context, 'text', 'portland'));
      this.assertText('portland');

      runTask(() => set(this.context, 'text', 'ohai'));
      this.assertText('ohai');
    }

    ['@test nested simple curlies inside of a yielded block should work when the yield is nested inside of another view']() {
      this.owner.register(
        'component:parent-comp',
        setComponentTemplate(
          precompileTemplate('{{#if this.falsy}}{{else}}{{yield}}{{/if}}'),
          class extends Component {}
        )
      );
      this.owner.register(
        'component:child-comp',
        setComponentTemplate(
          precompileTemplate('{{#if this.falsy}}{{else}}{{this.text}}{{/if}}'),
          class extends Component {}
        )
      );

      this.render('{{#parent-comp}}{{child-comp text=this.text}}{{/parent-comp}}', {
        text: 'ohai',
      });
      this.assertText('ohai');

      this.assertStableRerender();

      runTask(() => set(this.context, 'text', 'portland'));
      this.assertText('portland');

      runTask(() => set(this.context, 'text', 'ohai'));
      this.assertText('ohai');
    }

    ['@test yielding to a non-existent block is not an error']() {
      this.owner.register(
        'component:yielding-comp',
        setComponentTemplate(precompileTemplate('Hello:{{yield}}'), class extends Component {})
      );
      this.owner.register(
        'component:outer-comp',
        setComponentTemplate(
          precompileTemplate('{{yielding-comp}} {{this.title}}'),
          class extends Component {}
        )
      );

      this.render('{{outer-comp title=this.title}}', { title: 'Mr. Selden' });

      this.assertText('Hello: Mr. Selden');

      this.assertStableRerender();

      runTask(() => set(this.context, 'title', 'Mr. Chag'));
      this.assertText('Hello: Mr. Chag');

      runTask(() => set(this.context, 'title', 'Mr. Selden'));
      this.assertText('Hello: Mr. Selden');
    }

    ['@test yield uses the original context']() {
      let KiwiCompComponent = class extends Component {
        boundText = 'Inner';
      };

      this.owner.register(
        'component:kiwi-comp',
        setComponentTemplate(
          precompileTemplate('<p>{{this.boundText}}</p><p>{{yield}}</p>'),
          KiwiCompComponent
        )
      );

      this.render('{{#kiwi-comp}}{{this.boundText}}{{/kiwi-comp}}', {
        boundText: 'Original',
      });
      this.assertText('InnerOriginal');

      this.assertStableRerender();

      runTask(() => set(this.context, 'boundText', 'Otherworld'));
      this.assertText('InnerOtherworld');

      runTask(() => set(this.context, 'boundText', 'Original'));
      this.assertText('InnerOriginal');
    }

    ["@test outer block param doesn't mask inner component property"]() {
      let KiwiCompComponent = class extends Component {
        boundText = 'Inner';
      };

      this.owner.register(
        'component:kiwi-comp',
        setComponentTemplate(
          precompileTemplate('<p>{{this.boundText}}</p><p>{{yield}}</p>'),
          KiwiCompComponent
        )
      );

      this.render('{{#let this.boundText as |item|}}{{#kiwi-comp}}{{item}}{{/kiwi-comp}}{{/let}}', {
        boundText: 'Outer',
      });
      this.assertText('InnerOuter');

      this.assertStableRerender();

      runTask(() => set(this.context, 'boundText', 'Otherworld'));
      this.assertText('InnerOtherworld');

      runTask(() => set(this.context, 'boundText', 'Outer'));
      this.assertText('InnerOuter');
    }

    ["@test inner block param doesn't mask yield property"]() {
      let KiwiCompComponent = class extends Component {
        boundText = 'Inner';
      };

      this.owner.register(
        'component:kiwi-comp',
        setComponentTemplate(
          precompileTemplate(
            '{{#let this.boundText as |item|}}<p>{{item}}</p><p>{{yield}}</p>{{/let}}'
          ),
          KiwiCompComponent
        )
      );

      this.render('{{#kiwi-comp}}{{this.item}}{{/kiwi-comp}}', { item: 'Outer' });
      this.assertText('InnerOuter');

      this.assertStableRerender();

      runTask(() => set(this.context, 'item', 'Otherworld'));
      this.assertText('InnerOtherworld');

      runTask(() => set(this.context, 'item', 'Outer'));
      this.assertText('InnerOuter');
    }

    ['@test can bind a block param to a component and use it in yield']() {
      this.owner.register(
        'component:kiwi-comp',
        setComponentTemplate(
          precompileTemplate('<p>{{this.content}}</p><p>{{yield}}</p>'),
          class extends Component {}
        )
      );

      this.render(
        '{{#let this.boundText as |item|}}{{#kiwi-comp content=item}}{{item}}{{/kiwi-comp}}{{/let}}',
        { boundText: 'Outer' }
      );
      this.assertText('OuterOuter');

      this.assertStableRerender();

      runTask(() => set(this.context, 'boundText', 'Update'));
      this.assertText('UpdateUpdate');

      runTask(() => set(this.context, 'boundText', 'Outer'));
      this.assertText('OuterOuter');
    }

    // INUR not need with no data update
    ['@test yield should not introduce a view'](assert) {
      let ParentCompComponent = class extends Component {
        isParentComponent = true;
      };

      let ChildCompComponent = class extends Component {
        didReceiveAttrs() {
          super.didReceiveAttrs();
          let parentView = this.get('parentView');

          assert.ok(parentView.get('isParentComponent'));
        }
      };

      this.owner.register(
        'component:parent-comp',
        setComponentTemplate(precompileTemplate('{{yield}}'), ParentCompComponent)
      );
      this.owner.register('component:child-comp', ChildCompComponent);

      this.render('{{#parent-comp}}{{child-comp}}{{/parent-comp}}');
    }

    ['@test yield with nested components (#3220)']() {
      this.owner.register(
        'component:inner-component',
        setComponentTemplate(precompileTemplate('{{yield}}'), class extends Component {})
      );
      this.owner.register(
        'component:outer-component',
        setComponentTemplate(
          precompileTemplate('{{#inner-component}}<span>{{yield}}</span>{{/inner-component}}'),
          class extends Component {}
        )
      );

      this.render('{{#outer-component}}Hello {{this.boundText}}{{/outer-component}}', {
        boundText: 'world',
      });
      this.assertText('Hello world');

      this.assertStableRerender();

      runTask(() => set(this.context, 'boundText', 'update'));
      this.assertText('Hello update');

      runTask(() => set(this.context, 'boundText', 'world'));
      this.assertText('Hello world');
    }
  }
);
