import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

import { set } from '@ember/-internals/metal';
import { _setStrings } from '@ember/string';

moduleFor(
  'Helpers test: {{loc}}',
  class extends RenderingTestCase {
    constructor() {
      super(...arguments);
      _setStrings({
        'Hello Friend': 'Hallo Freund',
        Hello: 'Hallo, %@',
      });
    }

    teardown() {
      super.teardown();
      _setStrings({});
    }

    ['@test it lets the original value through by default']() {
      expectDeprecation(() => this.render(`{{loc "Hiya buddy!"}}`), /loc is deprecated/);
      this.assertText('Hiya buddy!', 'the unlocalized string is correct');
      runTask(() => this.rerender());
      this.assertText('Hiya buddy!', 'the unlocalized string is correct after rerender');
    }

    ['@test it localizes a simple string']() {
      expectDeprecation(() => this.render(`{{loc "Hello Friend"}}`), /loc is deprecated/);
      this.assertText('Hallo Freund', 'the localized string is correct');
      runTask(() => this.rerender());
      this.assertText('Hallo Freund', 'the localized string is correct after rerender');
    }

    ['@test it takes passed formats into an account']() {
      expectDeprecation(() => {
        this.render(`{{loc "%@, %@" "Hello" "Mr. Pitkin"}}`);
      }, /loc is deprecated/);
      this.assertText('Hello, Mr. Pitkin', 'the formatted string is correct');
      runTask(() => this.rerender());
      this.assertText('Hello, Mr. Pitkin', 'the formatted string is correct after rerender');
    }

    ['@test it updates when bound params change']() {
      expectDeprecation(() => {
        this.render(`{{loc simple}} - {{loc personal 'Mr. Pitkin'}}`, {
          simple: 'Hello Friend',
          personal: 'Hello',
        });
        this.assertText('Hallo Freund - Hallo, Mr. Pitkin', 'the bound value is correct');
      }, /loc is deprecated/);

      runTask(() => this.rerender());
      this.assertText(
        'Hallo Freund - Hallo, Mr. Pitkin',
        'the bound value is correct after rerender'
      );

      expectDeprecation(() => {
        runTask(() => set(this.context, 'simple', "G'day mate"));
        this.assertText(
          "G'day mate - Hallo, Mr. Pitkin",
          'the bound value is correct after update'
        );
      }, /loc is deprecated/);

      expectDeprecation(() => {
        runTask(() => set(this.context, 'simple', 'Hello Friend'));
        this.assertText(
          'Hallo Freund - Hallo, Mr. Pitkin',
          'the bound value is correct after reset'
        );
      }, /loc is deprecated/);
    }

    ['@test it updates when nested bound params change']() {
      expectDeprecation(() => {
        this.render(`{{loc greetings.simple}} - {{loc greetings.personal 'Mr. Pitkin'}}`, {
          greetings: {
            simple: 'Hello Friend',
            personal: 'Hello',
          },
        });
      }, /loc is deprecated/);
      this.assertText('Hallo Freund - Hallo, Mr. Pitkin', 'the bound value is correct');

      runTask(() => this.rerender());
      this.assertText(
        'Hallo Freund - Hallo, Mr. Pitkin',
        'the bound value is correct after rerender'
      );

      expectDeprecation(() => {
        runTask(() => set(this.context, 'greetings.simple', "G'day mate"));
        this.assertText(
          "G'day mate - Hallo, Mr. Pitkin",
          'the bound value is correct after interior mutation'
        );
      }, /loc is deprecated/);

      expectDeprecation(() => {
        runTask(() =>
          set(this.context, 'greetings', {
            simple: 'Hello Friend',
            personal: 'Hello',
          })
        );
        this.assertText(
          'Hallo Freund - Hallo, Mr. Pitkin',
          'the bound value is correct after replacement'
        );
      }, /loc is deprecated/);
    }

    ['@test it can be overriden']() {
      this.registerHelper('loc', () => 'Yup');
      this.render(`{{loc greeting}}`, {
        greeting: 'Hello Friend',
      });
      this.assertText('Yup', 'the localized string is correct');
    }
  }
);
