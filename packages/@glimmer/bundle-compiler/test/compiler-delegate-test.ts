import { BundleCompiler, TemplateLocator } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ProgramSymbolTable } from '@glimmer/interfaces';
import { BASIC_CAPABILITIES } from '@glimmer/test-helpers';
import { CompilableTemplate, CompileOptions, ICompilableTemplate } from '@glimmer/opcode-compiler';
import { SerializedTemplateBlock } from '@glimmer/wire-format';

const { test } = QUnit;

QUnit.module("[glimmer-bundle-compiler] CompilerDelegate");

test("correct referrer is passed during component lookup", function(assert) {
  let inScopeReferrers: TemplateLocator[] = [];
  let resolveComponentReferrers: TemplateLocator[] = [];

  // This partial implementation of CompilerDelegate tracks what referrers are
  // passed to hasComponentInScope and resolveComponentSpecifier so that they
  // can be verified after compilation has finished.
  class TestDelegate {
    hasComponentInScope(_componentName: string, referrer: TemplateLocator): boolean {
      inScopeReferrers.push(referrer);
      return true;
    }

    resolveComponent(componentName: string, referrer: TemplateLocator): TemplateLocator {
      resolveComponentReferrers.push(referrer);
      return { module: componentName, name: 'default' };
    }

    getComponentCapabilities(): ComponentCapabilities {
      return BASIC_CAPABILITIES;
    }

    getComponentLayout(_locator: TemplateLocator, block: SerializedTemplateBlock, options: CompileOptions<TemplateLocator>): ICompilableTemplate<ProgramSymbolTable> {
      return CompilableTemplate.topLevel(block, options);
    }
  }

  let bundleCompiler = new BundleCompiler(new TestDelegate() as any);

  bundleCompiler.add({ module: 'UserNav', name: 'default' }, '<div class="user-nav"></div>');
  bundleCompiler.add({ module: 'Main', name: 'default' }, '<UserNav />');
  bundleCompiler.add({ module: 'SideBar', name: 'default' }, '<UserNav />');
  bundleCompiler.compile();

  assert.deepEqual(inScopeReferrers, [
    { module: 'Main', name: 'default' },
    { module: 'SideBar', name: 'default' }
  ]);

  assert.deepEqual(resolveComponentReferrers, [
    { module: 'Main', name: 'default' },
    { module: 'SideBar', name: 'default' }
  ]);
});
