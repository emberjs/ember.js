import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';

function buildResolver() {
  let resolver = {
    resolve() { },
    expandLocalLookup(fullName, sourceFullName) {
      let [sourceType, sourceName ] = sourceFullName.split(':');
      let [type, name ] = fullName.split(':');

      if (type !== 'template' && sourceType === 'template' && sourceName.slice(0, 11) === 'components/') {
        sourceName = sourceName.slice(11);
      }

      if (type === 'template' && sourceType === 'template' && name.slice(0, 11) === 'components/') {
        name = name.slice(11);
      }


      let result = `${type}:${sourceName}/${name}`;

      return result;
    }
  };

  return resolver;
}

moduleFor('Components test: local lookup', class extends RenderingTest {
  getResolver() {
    return buildResolver();
  }

  ['@test it can lookup a local template']() {
    this.registerComponent('x-outer/x-inner', { template: 'Nested template says: {{yield}}' });
    this.registerComponent('x-outer', { template: '{{#x-inner}}Hi!{{/x-inner}}' });

    this.render('{{x-outer}}');

    this.assertText('Nested template says: Hi!', 'Initial render works');

    this.runTask(() => this.rerender());

    this.assertText('Nested template says: Hi!', 'Re-render works');
  }

  ['@test tagless blockless component can lookup local template']() {
    this.registerComponent('x-outer/x-inner', { template: 'Nested template says: {{yield}}' });
    this.registerTemplate('components/x-outer', '{{#x-inner}}Hi!{{/x-inner}}');
    this.registerComponent('x-outer', {
      ComponentClass: Component.extend({ tagName: '' })
    });

    this.render('{{x-outer}}');

    this.assertText('Nested template says: Hi!', 'Re-render works');

    this.runTask(() => this.rerender());

    this.assertText('Nested template says: Hi!', 'Re-render works');
  }

  ['@test it can lookup a local component template']() {
    this.registerTemplate('components/x-outer/x-inner', 'Nested template says: {{yield}}');
    this.registerTemplate('components/x-outer', '{{#x-inner}}Hi!{{/x-inner}}');

    this.render('{{x-outer}}');

    this.assertText('Nested template says: Hi!', 'Initial render works');

    this.runTask(() => this.rerender());

    this.assertText('Nested template says: Hi!', 'Re-render works');
  }

  ['@test it can local lookup a dynamic component']() {
    this.registerComponent('foo-bar', { template: 'yall finished {{component child}}' });
    this.registerComponent('foo-bar/biz-baz', { template: 'or yall done?' });

    this.render('{{foo-bar child=child}}', { child: 'biz-baz' });

    this.assertText('yall finished or yall done?');

    this.runTask(() => this.rerender());

    this.assertText('yall finished or yall done?');
  }

  ['@test it can local lookup a dynamic component from a dynamic component']() {
    this.registerComponent('foo-bar', { template: 'yall finished {{component child}}' });
    this.registerComponent('foo-bar/biz-baz', { template: 'or yall done?' });

    this.render('{{component componentName child=child}}', { componentName: 'foo-bar', child: 'biz-baz' });

    this.assertText('yall finished or yall done?');

    this.runTask(() => this.rerender());

    this.assertText('yall finished or yall done?');
  }

   ['@test it can local lookup a dynamic component from a passed named argument']() {
    this.registerComponent('parent-foo', { template: `yall finished {{global-biz baz=(component 'local-bar')}}` });
    this.registerComponent('global-biz', { template: 'or {{component baz}}' });
    this.registerComponent('parent-foo/local-bar', { template: 'yall done?' });

    this.render('{{parent-foo}}');

    this.assertText('yall finished or yall done?');

    this.runTask(() => this.rerender());

    this.assertText('yall finished or yall done?');
  }

  ['@test it can local lookup a re-wrapped dynamic component from a passed named argument']() {
    this.registerComponent('parent-foo', { template: `yall finished {{global-x comp=(component 'local-bar')}}` });
    this.registerComponent('global-x', { template: `or {{global-y comp=(component comp phrase='done')}}` });
    this.registerComponent('global-y', { template: `{{component comp}}?` });
    this.registerComponent('parent-foo/local-bar', { template: 'yall {{phrase}}' });

    this.render('{{parent-foo}}');

    this.assertText('yall finished or yall done?');

    this.runTask(() => this.rerender());

    this.assertText('yall finished or yall done?');
  }

  ['@test it can nest local lookups of dynamic components from a passed named argument']() {
    this.registerComponent('parent-foo', { template: `yall finished {{global-x comp=(component 'local-bar')}}` });
    this.registerComponent('global-x', { template: `or {{global-y comp=(component comp phrase='done')}}` });
    this.registerComponent('global-y', { template: `{{component comp}}{{component 'local-bar'}}` });
    this.registerComponent('parent-foo/local-bar', { template: 'yall {{phrase}}' });
    this.registerComponent('global-y/local-bar', { template: `?` });

    this.render('{{parent-foo}}');

    this.assertText('yall finished or yall done?');

    this.runTask(() => this.rerender());

    this.assertText('yall finished or yall done?');
  }

  ['@test it can switch from local to global lookups of dynamic components from a passed named argument']() {
    this.registerComponent('parent-foo', { template: `yall finished {{global-x comp=(component bar)}}` });
    this.registerComponent('global-x', { template: `or yall {{component comp}}` });
    this.registerComponent('parent-foo/local-bar', { template: 'done?' });
    this.registerComponent('global-bar', { template: `ready?` });

    this.render('{{parent-foo bar=bar}}', { bar: 'local-bar' });

    this.assertText('yall finished or yall done?');

    this.runTask(() => this.context.set('bar', 'global-bar'));

    this.runTask(() => this.rerender());

    this.assertText('yall finished or yall ready?');
  }

  ['@test it can lookup a local helper']() {
    this.registerHelper('x-outer/x-helper', () => {
      return 'Who dis?';
    });
    this.registerComponent('x-outer', { template: 'Who dat? {{x-helper}}' });

    this.render('{{x-outer}}');

    this.assertText('Who dat? Who dis?', 'Initial render works');

    this.runTask(() => this.rerender());

    this.assertText('Who dat? Who dis?', 'Re-render works');
  }

  ['@test it overrides global helper lookup']() {
    this.registerHelper('x-outer/x-helper', () => {
      return 'Who dis?';
    });

    this.registerHelper('x-helper', () => {
      return 'I dunno';
    });

    this.registerComponent('x-outer', { template: 'Who dat? {{x-helper}}' });

    this.render('{{x-outer}} {{x-helper}}');

    this.assertText('Who dat? Who dis? I dunno', 'Initial render works');

    this.runTask(() => this.rerender());

    this.assertText('Who dat? Who dis? I dunno', 'Re-render works');
  }

  ['@test lookup without match issues standard assertion (with local helper name)']() {
    this.registerComponent('x-outer', { template: '{{#x-inner}}Hi!{{/x-inner}}' });

    expectAssertion(() => {
      this.render('{{x-outer}}');
    }, /A component or helper named "x-inner" could not be found/);
  }

  ['@test overrides global lookup']() {
    this.registerComponent('x-outer', { template: '{{#x-inner}}Hi!{{/x-inner}}' });
    this.registerComponent('x-outer/x-inner', { template: 'Nested template says (from local): {{yield}}' });
    this.registerComponent('x-inner', { template: 'Nested template says (from global): {{yield}}' });

    this.render('{{#x-inner}}Hi!{{/x-inner}} {{x-outer}} {{#x-outer/x-inner}}Hi!{{/x-outer/x-inner}}');

    this.assertText('Nested template says (from global): Hi! Nested template says (from local): Hi! Nested template says (from local): Hi!');

    this.runTask(() => this.rerender());

    this.assertText('Nested template says (from global): Hi! Nested template says (from local): Hi! Nested template says (from local): Hi!');
  }
});
