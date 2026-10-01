import {
  moduleFor,
  RenderingTestCase,
  strip,
  runTask,
  expectClassicComponentDeprecation,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import { Component } from '../../utils/helpers';

moduleFor(
  'Components test: fragment components',
  class extends RenderingTestCase {
    getCustomDispatcherEvents() {
      return {
        hitDem: 'folks',
      };
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test fragments do not render an outer tag`]() {
      expectClassicComponentDeprecation();

      let instance;
      let FooBarComponent = class extends Component {
        tagName = '';
        init() {
          super.init(...arguments);
          instance = this;
          this.foo = true;
          this.bar = 'bar';
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{#if this.foo}}<div>Hey</div>{{/if}}{{yield this.bar}}'),
          FooBarComponent
        )
      );

      this.render(`{{#foo-bar as |bar|}}{{bar}}{{/foo-bar}}`);

      this.assertHTML(strip`<div>Hey</div>bar`);

      this.assertStableRerender();

      runTask(() => set(instance, 'foo', false));

      this.assertHTML(strip`<!---->bar`);

      runTask(() => set(instance, 'bar', 'bizz'));

      this.assertHTML(strip`<!---->bizz`);

      runTask(() => {
        set(instance, 'bar', 'bar');
        set(instance, 'foo', true);
      });
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test throws an error if an event function is defined in a tagless component`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
        click() {}
        mouseEnter() {}
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hit dem folks'), FooBarComponent)
      );

      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You can not define `click` function\(s\) to handle DOM event in the .* tagless component since it doesn't have any DOM element./);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test throws an error if a custom defined event function is defined in a tagless component`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
        folks() {}
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hit dem folks'), FooBarComponent)
      );

      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You can not define `folks` function\(s\) to handle DOM event in the .* tagless component since it doesn't have any DOM element./);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test throws an error if \`tagName\` is an empty string and \`classNameBindings\` are specified`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
        foo = true;
        classNameBindings = ['foo:is-foo:is-bar'];
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hit dem folks'), FooBarComponent)
      );

      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You cannot use `classNameBindings` on a tag-less component/);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test throws an error if \`tagName\` is an empty string and \`attributeBindings\` are specified`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
        attributeBindings = ['href'];
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hit dem folks'), FooBarComponent)
      );
      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You cannot use `attributeBindings` on a tag-less component/);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test throws an error if \`tagName\` is an empty string and \`elementId\` is specified via JS`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
        elementId = 'turntUp';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hit dem folks'), FooBarComponent)
      );
      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You cannot use `elementId` on a tag-less component/);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test throws an error if \`tagName\` is an empty string and \`elementId\` is specified via template`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hit dem folks'), FooBarComponent)
      );
      expectAssertion(() => {
        this.render(`{{#foo-bar elementId='turntUp'}}{{/foo-bar}}`);
      }, /You cannot use `elementId` on a tag-less component/);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test does not throw an error if \`tagName\` is an empty string and \`id\` is specified via JS`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
        id = 'baz';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.id}}'), FooBarComponent)
      );
      this.render(`{{#foo-bar}}{{/foo-bar}}`);
      this.assertText('baz');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test does not throw an error if \`tagName\` is an empty string and \`id\` is specified via template`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.id}}'), FooBarComponent)
      );
      this.render(`{{#foo-bar id='baz'}}{{/foo-bar}}`);
      this.assertText('baz');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test does not throw an error if \`tagName\` is an empty string and \`id\` is bound property specified via template`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.id}}'), FooBarComponent)
      );

      this.render(`{{#foo-bar id=this.fooBarId}}{{/foo-bar}}`, { fooBarId: 'baz' });

      this.assertText('baz');

      this.assertStableRerender();

      runTask(() => set(this.context, 'fooBarId', 'qux'));

      this.assertText('qux');

      runTask(() => set(this.context, 'fooBarId', 'baz'));

      this.assertText('baz');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test does not throw an error if \`tagName\` is an empty string and \`id\` is specified via template and passed to child component`]() {
      expectClassicComponentDeprecation();

      let FooBarComponent = class extends Component {
        tagName = '';
      };
      let BazChildComponent = class extends Component {};

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{#baz-child id=this.id}}{{/baz-child}}'),
          FooBarComponent
        )
      );
      this.owner.register(
        'component:baz-child',
        setComponentTemplate(precompileTemplate('{{this.id}}'), BazChildComponent)
      );
      this.render(`{{#foo-bar id='baz'}}{{/foo-bar}}`);
      this.assertText('baz');
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)} @test renders a contained view with omitted start tag and tagless parent view context`]() {
      expectClassicComponentDeprecation();

      this.owner.register(
        'component:root-component',
        setComponentTemplate(
          precompileTemplate('{{frag-ment}}'),
          class extends Component {
            tagName = 'section';
          }
        )
      );

      this.owner.register(
        'component:frag-ment',
        setComponentTemplate(
          precompileTemplate('{{my-span}}'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.owner.register(
        'component:my-span',
        setComponentTemplate(
          precompileTemplate('dab'),
          class extends Component {
            tagName = 'span';
          }
        )
      );

      this.render(`{{root-component}}`);

      this.assertElement(this.firstChild, { tagName: 'section' });
      this.assertElement(this.firstChild.firstElementChild, {
        tagName: 'span',
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, { tagName: 'section' });
      this.assertElement(this.firstChild.firstElementChild, {
        tagName: 'span',
      });
    }
  }
);
