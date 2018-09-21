import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import { set } from '@ember/-internals/metal';

moduleFor(
  'Helpers test: {{hash}}',
  class extends RenderingTest {
    ['@test returns a hash with the right key-value']() {
      this.render(`{{#with (hash name=\"Sergio\") as |person|}}{{person.name}}{{/with}}`);

      this.assertText('Sergio');

      this.runTask(() => this.rerender());

      this.assertText('Sergio');
    }

    ['@test can have more than one key-value']() {
      this.render(
        `{{#with (hash name="Sergio" lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/with}}`
      );

      this.assertText('Sergio Arbeo');

      this.runTask(() => this.rerender());

      this.assertText('Sergio Arbeo');
    }

    ['@test binds values when variables are used']() {
      this.render(
        `{{#with (hash name=model.firstName lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/with}}`,
        {
          model: {
            firstName: 'Marisa',
          },
        }
      );

      this.assertText('Marisa Arbeo');

      this.runTask(() => this.rerender());

      this.assertText('Marisa Arbeo');

      this.runTask(() => set(this.context, 'model.firstName', 'Sergio'));

      this.assertText('Sergio Arbeo');

      this.runTask(() => set(this.context, 'model', { firstName: 'Marisa' }));

      this.assertText('Marisa Arbeo');
    }

    ['@test binds multiple values when variables are used']() {
      this.render(
        `{{#with (hash name=model.firstName lastName=model.lastName) as |person|}}{{person.name}} {{person.lastName}}{{/with}}`,
        {
          model: {
            firstName: 'Marisa',
            lastName: 'Arbeo',
          },
        }
      );

      this.assertText('Marisa Arbeo');

      this.runTask(() => this.rerender());

      this.assertText('Marisa Arbeo');

      this.runTask(() => set(this.context, 'model.firstName', 'Sergio'));

      this.assertText('Sergio Arbeo');

      this.runTask(() => set(this.context, 'model.lastName', 'Smith'));

      this.assertText('Sergio Smith');

      this.runTask(() =>
        set(this.context, 'model', {
          firstName: 'Marisa',
          lastName: 'Arbeo',
        })
      );

      this.assertText('Marisa Arbeo');
    }

    ['@test hash helpers can be nested']() {
      this.render(
        `{{#with (hash person=(hash name=model.firstName)) as |ctx|}}{{ctx.person.name}}{{/with}}`,
        {
          model: { firstName: 'Balint' },
        }
      );

      this.assertText('Balint');

      this.runTask(() => this.rerender());

      this.assertText('Balint');

      this.runTask(() => set(this.context, 'model.firstName', 'Chad'));

      this.assertText('Chad');

      this.runTask(() => set(this.context, 'model', { firstName: 'Balint' }));

      this.assertText('Balint');
    }

    ['@test should yield hash of internal properties']() {
      let fooBarInstance;
      let FooBarComponent = Component.extend({
        init() {
          this._super();
          fooBarInstance = this;
          this.model = { firstName: 'Chad' };
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: `{{yield (hash firstName=model.firstName)}}`,
      });

      this.render(`{{#foo-bar as |values|}}{{values.firstName}}{{/foo-bar}}`);

      this.assertText('Chad');

      this.runTask(() => this.rerender());

      this.assertText('Chad');

      this.runTask(() => set(fooBarInstance, 'model.firstName', 'Godfrey'));

      this.assertText('Godfrey');

      this.runTask(() => set(fooBarInstance, 'model', { firstName: 'Chad' }));

      this.assertText('Chad');
    }

    ['@test should yield hash of internal and external properties']() {
      let fooBarInstance;
      let FooBarComponent = Component.extend({
        init() {
          this._super();
          fooBarInstance = this;
          this.model = { firstName: 'Chad' };
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: `{{yield (hash firstName=model.firstName lastName=lastName)}}`,
      });

      this.render(
        `{{#foo-bar lastName=model.lastName as |values|}}{{values.firstName}} {{values.lastName}}{{/foo-bar}}`,
        {
          model: { lastName: 'Hietala' },
        }
      );

      this.assertText('Chad Hietala');

      this.runTask(() => this.rerender());

      this.assertText('Chad Hietala');

      this.runTask(() => {
        set(fooBarInstance, 'model.firstName', 'Godfrey');
        set(this.context, 'model.lastName', 'Chan');
      });

      this.assertText('Godfrey Chan');

      this.runTask(() => {
        set(fooBarInstance, 'model', { firstName: 'Chad' });
        set(this.context, 'model', { lastName: 'Hietala' });
      });

      this.assertText('Chad Hietala');
    }
  }
);
