import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordGteRuntime extends RenderTest {
  static suiteName = 'keyword helper: gte (runtime)';

  @test
  'explicit scope'() {
    const compiled = template('{{if (gte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: 2, b: 2 }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'no eval and no scope'() {
    class Foo extends GlimmerishComponent {
      a = 2;
      b = 2;
      static {
        template('{{if (gte this.a this.b) "yes" "no"}}', {
          strictMode: true,
          component: this,
        });
      }
    }
    this.renderComponent(Foo);
    this.assertHTML('yes');
  }
}

jitSuite(KeywordGteRuntime);
