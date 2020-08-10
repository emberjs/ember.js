import { EmberishComponentTests } from './emberish-components';
import { AotRenderDelegate } from '../modes/aot/delegate';
import { test } from '../test-decorator';
import { EmberishGlimmerComponent } from '../components/emberish-glimmer';

export class BundleCompilerEmberTests extends EmberishComponentTests {
  protected delegate!: AotRenderDelegate;

  @test({ kind: 'glimmer' })
  'should not serialize the locator with static component helpers'() {
    this.registerComponent(
      'Glimmer',
      'A',
      '{{component "B" foo=@bar}} {{component "B" foo=2}} {{component "B" foo=3}}'
    );
    this.registerComponent('Glimmer', 'B', 'B {{@foo}}');
    this.render('<A @bar={{1}} /> {{component "B" foo=4}}');
    let ALocator = JSON.stringify({ module: 'ui/components/A', name: 'default' });
    let MainLocator = JSON.stringify({
      module: 'ui/components/main',
      name: 'default',
    });
    let values = this.delegate.getConstants();
    this.assert.equal(values.indexOf(ALocator), -1);
    this.assert.equal(values.indexOf(MainLocator), -1);
    this.assertHTML('B 1 B 2 B 3 B 4');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  'should not serialize if there are no args'() {
    class B extends EmberishGlimmerComponent {
      bar = 1;
    }
    this.registerComponent('Glimmer', 'A', '{{component "B"}}');
    this.registerComponent('Glimmer', 'B', 'B {{bar}}', B);
    this.render('<A /> {{component "B"}}');
    let ALocator = JSON.stringify({ locator: { module: 'ui/components/A', name: 'default' } });
    let MainLocator = JSON.stringify({
      locator: { module: 'ui/components/main', name: 'default' },
    });
    let values = this.delegate.constants!.toPool();
    this.assert.equal(values.indexOf(ALocator), -1);
    this.assert.equal(values.indexOf(MainLocator), -1);
    this.assertHTML('B 1 B 1');
    this.assertStableRerender();
  }
}
