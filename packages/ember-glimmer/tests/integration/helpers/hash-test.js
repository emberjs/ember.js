import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';
import setProperties from 'ember-metal/set_properties';
import Component from 'ember-views/components/component';

moduleFor('Helpers test: {{hash}}', class extends RenderingTest {

  ['@test returns a hash with the right key-value']() {
    this.render(`{{#with (hash name=\"Sergio\") as |person|}}{{person.name}}{{/with}}`);

    this.assertText('Sergio');

    this.runTask(() => this.rerender());

    this.assertText('Sergio');
  }

  ['@test can have more than one key-value']() {
    this.render(`{{#with (hash name="Sergio" lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/with}}`);

    this.assertText('Sergio Arbeo');

    this.runTask(() => this.rerender());

    this.assertText('Sergio Arbeo');
  }

  ['@test binds values when variables are used']() {
    this.render(`{{#with (hash name=firstName lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/with}}`, {
      firstName: 'Marisa'
    });

    this.assertText('Marisa Arbeo');

    this.runTask(() => this.rerender());

    this.assertText('Marisa Arbeo');

    this.runTask(() => set(this.context, 'firstName', 'Sergio'));

    this.assertText('Sergio Arbeo');

    this.runTask(() => set(this.context, 'firstName', 'Marisa'));

    this.assertText('Marisa Arbeo');
  }

  ['@test binds multiple values when variables are used']() {
    this.render(`{{#with (hash name=firstName lastName=lastName) as |person|}}{{person.name}} {{person.lastName}}{{/with}}`, {
      firstName: 'Marisa',
      lastName: 'Arbeo'
    });

    this.assertText('Marisa Arbeo');

    this.runTask(() => this.rerender());

    this.assertText('Marisa Arbeo');

    this.runTask(() => set(this.context, 'firstName', 'Sergio'));

    this.assertText('Sergio Arbeo');

    this.runTask(() => set(this.context, 'lastName', 'Smith'));

    this.assertText('Sergio Smith');

    this.runTask(() => setProperties(this.context, {
      firstName: 'Marisa',
      lastName: 'Arbeo'
    }));

    this.assertText('Marisa Arbeo');
  }

  ['@test hash helpers can be nested']() {
    this.render(`{{#with (hash person=(hash name=firstName)) as |ctx|}}{{ctx.person.name}}{{/with}}`, {
      firstName: 'Balint'
    });

    this.assertText('Balint');

    this.runTask(() => this.rerender());

    this.assertText('Balint');

    this.runTask(() => set(this.context, 'firstName', 'Chad'));

    this.assertText('Chad');

    this.runTask(() => set(this.context, 'firstName', 'Balint'));

    this.assertText('Balint');
  }

  ['@test should yield hash of internal properties']() {
    let fooBarInstance;
    let FooBarComponent = Component.extend({
      init() {
        this._super();
        fooBarInstance = this;
        this.firstName = 'Chad';
      }
    });

    this.registerComponent('foo-bar', {
      ComponentClass: FooBarComponent,
      template: `{{yield (hash firstName=firstName)}}`
    });

    this.render(`{{#foo-bar as |values|}}{{values.firstName}}{{/foo-bar}}`);

    this.assertText('Chad');

    this.runTask(() => this.rerender());

    this.assertText('Chad');

    this.runTask(() => set(fooBarInstance, 'firstName', 'Godfrey'));

    this.assertText('Godfrey');

    this.runTask(() => set(fooBarInstance, 'firstName', 'Chad'));

    this.assertText('Chad');
  }

  ['@test should yield hash of internal and external properties']() {
    let fooBarInstance;
    let FooBarComponent = Component.extend({
      init() {
        this._super();
        fooBarInstance = this;
        this.firstName = 'Chad';
      }
    });

    this.registerComponent('foo-bar', {
      ComponentClass: FooBarComponent,
      template: `{{yield (hash firstName=firstName lastName=lastName)}}`
    });

    this.render(`{{#foo-bar lastName=lastName as |values|}}{{values.firstName}} {{values.lastName}}{{/foo-bar}}`, {
      lastName: 'Hietala'
    });

    this.assertText('Chad Hietala');

    this.runTask(() => this.rerender());

    this.assertText('Chad Hietala');

    this.runTask(() => set(fooBarInstance, 'firstName', 'Godfrey'));

    this.runTask(() => set(this.context, 'lastName', 'Chan'));

    this.assertText('Godfrey Chan');

    this.runTask(() => set(fooBarInstance, 'firstName', 'Chad'));
    this.runTask(() => set(this.context, 'lastName', 'Hietala'));

    this.assertText('Chad Hietala');
  }

});
