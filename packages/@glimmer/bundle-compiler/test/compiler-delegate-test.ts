import { BundleCompiler } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ModuleLocator } from '@glimmer/interfaces';
import { MINIMAL_CAPABILITIES } from '@glimmer/opcode-compiler';
import { assign } from '@glimmer/util';

const { test } = QUnit;

export const BASIC_CAPABILITIES: ComponentCapabilities = assign({}, MINIMAL_CAPABILITIES, {
  createInstance: true,
});

export interface WrappedLocator {
  locator: ModuleLocator;
}

QUnit.module('[glimmer-bundle-compiler] CompilerDelegate');

function locatorFor(locator: ModuleLocator): ModuleLocator {
  let { module, name } = locator;

  return {
    module,
    name,
  };
}

test('correct referrer is passed during component lookup', function(assert) {
  let inScopeReferrers: ModuleLocator[] = [];
  let resolveComponentReferrers: ModuleLocator[] = [];

  // This partial implementation of CompilerDelegate tracks what referrers are
  // passed to hasComponentInScope and resolveComponent so that they
  // can be verified after compilation has finished.
  class TestDelegate {
    hasComponentInScope(_componentName: string, referrer: ModuleLocator): boolean {
      inScopeReferrers.push(referrer);
      return true;
    }

    resolveComponent(componentName: string, referrer: ModuleLocator): ModuleLocator {
      resolveComponentReferrers.push(referrer);
      return { module: componentName, name: 'default' };
    }

    getComponentCapabilities(): ComponentCapabilities {
      return MINIMAL_CAPABILITIES;
    }
  }

  let bundleCompiler = new BundleCompiler(new TestDelegate() as any);

  bundleCompiler.addTemplateSource(
    locatorFor({ module: 'UserNav', name: 'default' }),
    '<div class="user-nav"></div>'
  );
  bundleCompiler.addTemplateSource(locatorFor({ module: 'Main', name: 'default' }), '<UserNav />');
  bundleCompiler.addTemplateSource(
    locatorFor({ module: 'SideBar', name: 'default' }),
    '<UserNav />'
  );
  bundleCompiler.compile();

  assert.deepEqual(inScopeReferrers, [
    { module: 'Main', name: 'default' },
    { module: 'SideBar', name: 'default' },
  ]);

  assert.deepEqual(resolveComponentReferrers, [
    { module: 'Main', name: 'default' },
    { module: 'SideBar', name: 'default' },
  ]);
});
