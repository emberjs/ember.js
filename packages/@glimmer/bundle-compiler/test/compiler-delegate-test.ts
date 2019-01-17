import { BundleCompiler } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ModuleLocator } from '@glimmer/interfaces';
import { MINIMAL_CAPABILITIES } from '@glimmer/opcode-compiler';

const { test } = QUnit;

export const BASIC_CAPABILITIES: ComponentCapabilities = {
  ...MINIMAL_CAPABILITIES,
  createInstance: true,
};

QUnit.module('[glimmer-bundle-compiler] CompilerDelegate');

type Locator = {
  locator: ModuleLocator;
};

function locatorFor(locator: ModuleLocator) {
  let { module, name } = locator;

  return {
    module,
    name,
    meta: { locator },
  };
}

test('correct referrer is passed during component lookup', function(assert) {
  let inScopeReferrers: Locator[] = [];
  let resolveComponentReferrers: Locator[] = [];

  // This partial implementation of CompilerDelegate tracks what referrers are
  // passed to hasComponentInScope and resolveComponent so that they
  // can be verified after compilation has finished.
  class TestDelegate {
    hasComponentInScope(_componentName: string, referrer: Locator): boolean {
      inScopeReferrers.push(referrer);
      return true;
    }

    resolveComponent(componentName: string, referrer: Locator): ModuleLocator {
      resolveComponentReferrers.push(referrer);
      return { module: componentName, name: 'default' };
    }

    getComponentCapabilities(): ComponentCapabilities {
      return MINIMAL_CAPABILITIES;
    }
  }

  let bundleCompiler = new BundleCompiler(new TestDelegate() as any);

  bundleCompiler.add(
    locatorFor({ module: 'UserNav', name: 'default' }),
    '<div class="user-nav"></div>'
  );
  bundleCompiler.add(locatorFor({ module: 'Main', name: 'default' }), '<UserNav />');
  bundleCompiler.add(locatorFor({ module: 'SideBar', name: 'default' }), '<UserNav />');
  bundleCompiler.compile();

  assert.deepEqual(inScopeReferrers, [
    { locator: { module: 'Main', name: 'default' } },
    { locator: { module: 'SideBar', name: 'default' } },
  ]);

  assert.deepEqual(resolveComponentReferrers, [
    { locator: { module: 'Main', name: 'default' } },
    { locator: { module: 'SideBar', name: 'default' } },
  ]);
});
