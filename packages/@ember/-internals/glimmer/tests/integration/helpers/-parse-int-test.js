import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

moduleFor(
  'Helpers test: {{-parse-int}}',
  class extends RenderingTestCase {
    ['@test parseInt helper']() {
      this.render(`{{-parse-int "123456789"}}`, {
        someTruth: true,
      });

      this.assertTextNode(this.firstChild, '123456789');
    }
  }
);
