import TransformTestCase from '../utils/transform-test-case';
import { moduleFor } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforming big numbers into parseInt form',
  class extends TransformTestCase {
    ['@test it transforms an big number to the parseInt form']() {
      this.assertTransformed(`{{foo-helper 1234567890}}`, `{{foo-helper (-parse-int "1234567890")}}`);
      this.assertTransformed(`{{foo-helper 123456789}}`, `{{foo-helper 123456789}}`);
    }
  }
);
