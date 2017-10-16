import { BundleCompiler, Specifier, specifierFor } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ProgramSymbolTable } from '@glimmer/interfaces';
import { BASIC_CAPABILITIES } from '@glimmer/test-helpers';
import { CompilableTemplate, CompileOptions, ICompilableTemplate } from '@glimmer/opcode-compiler';
import { SerializedTemplateBlock } from '@glimmer/wire-format';

const { test } = QUnit;

QUnit.module("[glimmer-bundle-compiler] CompilerDelegate");

test("correct referrer is passed during component lookup", function(assert) {
  let inScopeReferrers: Specifier[] = [];
  let resolveComponentReferrers: Specifier[] = [];

  // This partial implementation of CompilerDelegate tracks what referrers are
  // passed to hasComponentInScope and resolveComponentSpecifier so that they
  // can be verified after compilation has finished.
  class TestDelegate {
    hasComponentInScope(_componentName: string, referrer: Specifier): boolean {
      inScopeReferrers.push(referrer);
      return true;
    }

    resolveComponentSpecifier(componentName: string, referrer: Specifier): Specifier {
      resolveComponentReferrers.push(referrer);
      return specifierFor(componentName, 'default');
    }

    getComponentCapabilities(): ComponentCapabilities {
      return BASIC_CAPABILITIES;
    }

    getComponentLayout(_specifier: Specifier, block: SerializedTemplateBlock, options: CompileOptions<Specifier>): ICompilableTemplate<ProgramSymbolTable> {
      return CompilableTemplate.topLevel(block, options);
    }
  }

  let bundleCompiler = new BundleCompiler(new TestDelegate() as any);

  bundleCompiler.add(specifierFor('UserNav', 'default'), '<div class="user-nav"></div>');
  bundleCompiler.add(specifierFor('Main', 'default'), '<UserNav />');
  bundleCompiler.add(specifierFor('SideBar', 'default'), '<UserNav />');
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
