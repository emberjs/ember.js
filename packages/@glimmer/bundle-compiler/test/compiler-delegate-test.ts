import { BundleCompiler, ModuleLocator } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ProgramSymbolTable } from '@glimmer/interfaces';
import { BASIC_CAPABILITIES } from '@glimmer/test-helpers';
import { CompilableTemplate, CompileOptions, ICompilableTemplate } from '@glimmer/opcode-compiler';
import { SerializedTemplateBlock } from '@glimmer/wire-format';

const { test } = QUnit;

QUnit.module("[glimmer-bundle-compiler] CompilerDelegate");

type TemplateMeta = {
  locator: ModuleLocator;
};

function locatorFor(locator: ModuleLocator) {
  let { module, name } = locator;

  return {
    module,
    name,
    meta: { locator }
  };
}

test("correct referrer is passed during component lookup", function(assert) {
  let inScopeReferrers: TemplateMeta[] = [];
  let resolveComponentReferrers: TemplateMeta[] = [];

  // This partial implementation of CompilerDelegate tracks what referrers are
  // passed to hasComponentInScope and resolveComponent so that they
  // can be verified after compilation has finished.
  class TestDelegate {
    hasComponentInScope(_componentName: string, referrer: TemplateMeta): boolean {
      inScopeReferrers.push(referrer);
      return true;
    }

    resolveComponent(componentName: string, referrer: TemplateMeta): ModuleLocator {
      resolveComponentReferrers.push(referrer);
      return { module: componentName, name: 'default' };
    }

    getComponentCapabilities(): ComponentCapabilities {
      return BASIC_CAPABILITIES;
    }

    getComponentLayout(_locator: ModuleLocator, block: SerializedTemplateBlock, options: CompileOptions<TemplateMeta>): ICompilableTemplate<ProgramSymbolTable> {
      return CompilableTemplate.topLevel(block, options);
    }
  }

  let bundleCompiler = new BundleCompiler(new TestDelegate() as any);

  bundleCompiler.add(locatorFor({ module: 'UserNav', name: 'default' }), '<div class="user-nav"></div>');
  bundleCompiler.add(locatorFor({ module: 'Main', name: 'default' }), '<UserNav />');
  bundleCompiler.add(locatorFor({ module: 'SideBar', name: 'default' }), '<UserNav />');
  bundleCompiler.compile();

  assert.deepEqual(inScopeReferrers, [
    { locator: { module: 'Main', name: 'default' } },
    { locator: { module: 'SideBar', name: 'default' } }
  ]);

  assert.deepEqual(resolveComponentReferrers, [
    { locator: { module: 'Main', name: 'default' } },
    { locator: { module: 'SideBar', name: 'default' } }
  ]);
});
