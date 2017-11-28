import { EmberishGlimmerComponent, rawModule, EmberishComponentTests, EagerRenderDelegate, test } from "@glimmer/test-helpers";

class BundleCompilerEmberTests extends EmberishComponentTests {
  @test({ kind: 'glimmer' })
  "should not serialize the locator with static component helpers"() {
    this.registerComponent('Glimmer', 'A', '{{component "B" foo=@bar}} {{component "B" foo=2}} {{component "B" foo=3}}');
    this.registerComponent('Glimmer', 'B', 'B {{@foo}}');
    this.render('<A @bar={{1}} /> {{component "B" foo=4}}');
    let ALocator = JSON.stringify({ locator: { module: 'ui/components/A', name: 'default' } });
    let MainLocator = JSON.stringify({ locator: { module: 'ui/components/main', name: 'default' } });
    let { strings } = this.delegate.constants!.toPool();
    this.assert.equal(strings.indexOf(ALocator), -1);
    this.assert.equal(strings.indexOf(MainLocator), -1);
    this.assertHTML('B 1 B 2 B 3 B 4');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  "should not serialize if there are no args"() {
    class B extends EmberishGlimmerComponent {
      bar = 1;
    }
    this.registerComponent('Glimmer', 'A', '{{component "B"}}');
    this.registerComponent('Glimmer', 'B', 'B {{bar}}', B);
    this.render('<A /> {{component "B"}}');
    let ALocator = JSON.stringify({ locator: { module: 'ui/components/A', name: 'default' } });
    let MainLocator = JSON.stringify({ locator: { module: 'ui/components/main', name: 'default' } });
    let { strings } = this.delegate.constants!.toPool();
    this.assert.equal(strings.indexOf(ALocator), -1);
    this.assert.equal(strings.indexOf(MainLocator), -1);
    this.assertHTML('B 1 B 1');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  "should serialize the locator with dynamic component helpers"() {
    this.registerComponent('Glimmer', 'A', '{{component @B foo=@bar}}');
    this.registerComponent('Glimmer', 'B', 'B {{@foo}}');
    this.render('<A @bar={{1}} @B={{name}} />', { name: 'B' });
    let ALocator = JSON.stringify({ locator: { module: 'ui/components/A', name: 'default' } });
    let MainLocator = JSON.stringify({ locator: { module: 'ui/components/main', name: 'default' } });
    let { strings } = this.delegate.constants!.toPool();
    this.assert.ok(strings.indexOf(ALocator) > -1, 'Has locator for "A"');
    this.assert.equal(strings.indexOf(MainLocator), -1);
    this.assertHTML('B 1');
    this.assertStableRerender();
  }
}

rawModule('[Bundle Compiler] Emberish Components', BundleCompilerEmberTests, EagerRenderDelegate, { componentModule: true });
