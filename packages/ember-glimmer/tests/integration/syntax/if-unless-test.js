import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal/property_set';

moduleFor('Syntax test: {{#if}}', class extends RenderingTest {

  ['@test The `{{#if}}` syntax renders and hides the given block based on the conditional']() {
    this.render(`{{#if cond1}}1{{/if}}{{#if cond2}}2{{/if}}`, { cond1: true, cond2: false });
    this.assertText('1');

    this.inZone(() => this.rerender());

    this.assertText('1');

    this.inZone(() => set(this.context, 'cond1', false));

    this.assertText('');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', true);
    });

    this.assertText('12');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', false);
    });

    this.assertText('1');
  }

  ['@test The `{{#if}}` syntax renders the corresponding block based on the conditional']() {
    this.render(`{{#if cond1}}T1{{else}}F1{{/if}}{{#if cond2}}T2{{else}}F2{{/if}}`, { cond1: true, cond2: false });
    this.assertText('T1F2');

    this.inZone(() => this.rerender());

    this.assertText('T1F2');

    this.inZone(() => set(this.context, 'cond1', false));

    this.assertText('F1F2');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', true);
    });

    this.assertText('T1T2');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', false);
    });

    this.assertText('T1F2');
  }

  ['@test The `{{#if}}` syntax works with syntax renders the corresponding block based on the conditional']() {
    this.render(`{{#if cond1}}T1{{else}}F1{{/if}}{{#if cond2}}T2{{else}}F2{{/if}}`, { cond1: true, cond2: false });
    this.assertText('T1F2');

    this.inZone(() => this.rerender());

    this.assertText('T1F2');

    this.inZone(() => set(this.context, 'cond1', false));

    this.assertText('F1F2');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', true);
    });

    this.assertText('T1T2');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', false);
    });

    this.assertText('T1F2');
  }

});

moduleFor('Syntax test: {{#unless}}', class extends RenderingTest {

  ['@test The `{{#unless}}` syntax renders and hides the given block based on the conditional']() {
    this.render(`{{#unless cond1}}1{{/unless}}{{#unless cond2}}2{{/unless}}`, { cond1: true, cond2: false });
    this.assertText('2');

    this.inZone(() => this.rerender());

    this.assertText('2');

    this.inZone(() => set(this.context, 'cond2', true));

    this.assertText('');

    this.inZone(() => {
      set(this.context, 'cond1', false);
      set(this.context, 'cond2', false);
    });

    this.assertText('12');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', false);
    });

    this.assertText('2');
  }

  ['@test The `{{#unless}}` syntax renders the corresponding block based on the conditional']() {
    this.render(`{{#unless cond1}}F1{{else}}T1{{/unless}}{{#unless cond2}}F2{{else}}T2{{/unless}}`, { cond1: true, cond2: false });
    this.assertText('T1F2');

    this.inZone(() => this.rerender());

    this.assertText('T1F2');

    this.inZone(() => set(this.context, 'cond1', false));

    this.assertText('F1F2');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', true);
    });

    this.assertText('T1T2');

    this.inZone(() => {
      set(this.context, 'cond1', true);
      set(this.context, 'cond2', false);
    });

    this.assertText('T1F2');
  }

});
