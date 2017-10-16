import { rawModule, EagerRenderDelegate, InElementSuite, test } from "@glimmer/test-helpers";

class BundleCompiledInElement extends InElementSuite {
  @test
  "Top level in-element components"() {
    this.registerComponent('Glimmer', 'A', '{{#in-element @element}}Hello{{/in-element}}');
    let element = document.createElement('div');
    this.render('<A @element={{element}} />', { element });
    this.assertHTML('<!---->');
    this.assert.equal('Hello', element.textContent);
  }
}

rawModule('[Bundle Compiler] In-Element Tests', BundleCompiledInElement, EagerRenderDelegate);
