import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal';
import Ember from 'ember';

moduleFor('Helpers test: {{loc}}', class extends RenderingTest {

  constructor() {
    super();
    this.oldString = Ember.STRINGS;
    Ember.STRINGS = {
      'Hello Friend': 'Hallo Freund',
      'Hello': 'Hallo, %@'
    };
  }

  teardown() {
    super.teardown();
    Ember.STRINGS = this.oldString;
  }

  ['@test it lets the original value through by default']() {
    this.render(`{{loc "Hiya buddy!"}}`);
    this.assertText('Hiya buddy!', 'the unlocalized string is correct');
    this.runTask(() => this.rerender());
    this.assertText('Hiya buddy!', 'the unlocalized string is correct after rerender');
  }

  ['@test it localizes a simple string']() {
    this.render(`{{loc "Hello Friend"}}`);
    this.assertText('Hallo Freund', 'the localized string is correct');
    this.runTask(() => this.rerender());
    this.assertText('Hallo Freund', 'the localized string is correct after rerender');
  }

  ['@test it takes passed formats into an account']() {
    this.render(`{{loc "%@, %@" "Hello" "Mr. Pitkin"}}`);
    this.assertText('Hello, Mr. Pitkin', 'the formatted string is correct');
    this.runTask(() => this.rerender());
    this.assertText('Hello, Mr. Pitkin', 'the formatted string is correct after rerender');
  }

  ['@test it updates when bound params change']() {
    this.render(`{{loc simple}} - {{loc personal 'Mr. Pitkin'}}`, {
      simple: 'Hello Friend',
      personal: 'Hello'
    });
    this.assertText('Hallo Freund - Hallo, Mr. Pitkin',
                    'the bound value is correct');

    this.runTask(() => this.rerender());
    this.assertText('Hallo Freund - Hallo, Mr. Pitkin',
                    'the bound value is correct after rerender');

    this.runTask(() => set(this.context, 'simple', 'G\'day mate'));
    this.assertText('G\'day mate - Hallo, Mr. Pitkin',
                    'the bound value is correct after update');

    this.runTask(() => set(this.context, 'simple', 'Hello Friend'));
    this.assertText('Hallo Freund - Hallo, Mr. Pitkin',
                    'the bound value is correct after reset');
  }

  ['@test it updates when nested bound params change']() {
    this.render(`{{loc greetings.simple}} - {{loc greetings.personal 'Mr. Pitkin'}}`, {
      greetings: {
        simple: 'Hello Friend',
        personal: 'Hello'
      }
    });
    this.assertText('Hallo Freund - Hallo, Mr. Pitkin',
                    'the bound value is correct');

    this.runTask(() => this.rerender());
    this.assertText('Hallo Freund - Hallo, Mr. Pitkin',
                    'the bound value is correct after rerender');

    this.runTask(() => set(this.context, 'greetings.simple', 'G\'day mate'));
    this.assertText('G\'day mate - Hallo, Mr. Pitkin',
                    'the bound value is correct after interior mutation');

    this.runTask(() => set(this.context, 'greetings', {
      simple: 'Hello Friend',
      personal: 'Hello'
    }));
    this.assertText('Hallo Freund - Hallo, Mr. Pitkin',
                    'the bound value is correct after replacement');
  }

  ['@test it can be overriden']() {
    this.registerHelper('loc', () => 'Yup');
    this.render(`{{loc greeting}}`, {
      greeting: 'Hello Friend'
    });
    this.assertText('Yup', 'the localized string is correct');      
  }
});
