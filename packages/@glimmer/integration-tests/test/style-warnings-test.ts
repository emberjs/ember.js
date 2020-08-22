import { testOverrideGlobalContext, GlobalContext } from '@glimmer/global-context';
import { assert } from './support';
import { RenderTest, test, jitSuite } from '..';

let warnings = 0;
let originalContext: GlobalContext | null;

class StyleWarningsTest extends RenderTest {
  static suiteName = 'Style attributes';

  beforeEach() {
    warnings = 0;
    originalContext = testOverrideGlobalContext!({
      warnIfStyleNotTrusted() {
        warnings++;
      },
    });
  }

  afterEach() {
    testOverrideGlobalContext!(originalContext);
  }

  @test
  'Standard element with static style and element modifier does not give you a warning'() {
    this.registerModifier('foo', class {});
    this.render('<button style="display: flex" {{foo}}>click me</button>', {});

    assert.strictEqual(warnings, 0);
  }

  @test
  'Standard element with dynamic style and element modifier gives you 1 warning'() {
    this.registerModifier('foo', class {});
    this.render('<button style={{dynAttr}} {{foo}}>click me</button>', { dynAttr: 'display:flex' });

    assert.strictEqual(warnings, 1);
  }

  @test
  'using a static inline style on an element does not give you a warning'() {
    this.render(`<div style="background: red">Thing</div>`, {});

    assert.strictEqual(warnings, 0);
    this.assertHTML('<div style="background: red">Thing</div>', 'initial render');
  }

  @test
  'triple curlies are trusted'() {
    this.render(`<div foo={{foo}} style={{{styles}}}>Thing</div>`, { styles: 'background: red' });

    assert.strictEqual(warnings, 0);
    this.assertHTML('<div style="background: red">Thing</div>', 'initial render');
  }

  @test
  'using a static inline style on an namespaced element does not give you a warning'() {
    this.render(`<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red" />`, {});

    assert.strictEqual(warnings, 0);

    this.assertHTML(
      '<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red"></svg>',
      'initial render'
    );
  }
}

jitSuite(StyleWarningsTest);
