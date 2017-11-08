import { CompileTimeLookup, ICompilableTemplate } from "@glimmer/opcode-compiler";

import CompilerDelegate from './compiler-delegate';
import ExternalModuleTable from './external-module-table';
import BundleCompiler from './bundle-compiler';
import { ComponentCapabilities, ProgramSymbolTable } from "@glimmer/interfaces";
import { expect, Option } from "@glimmer/util";

/**
 * The BundleCompilerResolver resolves references to objects inside a template into
 * handles that can be redeemed for concrete objects at runtime.
 *
 * For example, if the `translate` helper is used in a template (`{{translate
 * someText}}`), the compiler will invoke the resolver's `lookupHelper` method
 * with the name of the helper ("translate") and the locator for the template
 * that contained the invocation.
 *
 * The resolver is responsible for assigning a unique handle to this `translate`
 * helper and ensuring that any future calls to `lookupHelper` that refer to the
 * same helper return the same handle.
 */
export default class CompilerResolver<TemplateMeta> implements CompileTimeLookup<TemplateMeta> {
  constructor(private delegate: CompilerDelegate<TemplateMeta>, private table: ExternalModuleTable, private compiler: BundleCompiler<TemplateMeta>) { }

  getCapabilities(handle: number): ComponentCapabilities {
    let locator = expect(this.table.byHandle.get(handle), `BUG: Shouldn't call getCapabilities if a handle has no associated locator`);
    let meta = expect(this.compiler.meta.get(locator), `could not find template metadata for module ${locator.module}`);
    return this.delegate.getComponentCapabilities(meta);
  }

  getLayout(handle: number): Option<ICompilableTemplate<ProgramSymbolTable>> {
    let locator = expect(this.table.byHandle.get(handle), `BUG: Shouldn't call getLayout if a handle has no associated locator`);
    return this.compiler.compilableTemplates.get(locator) || null;
  }

  lookupHelper(name: string, referrer: TemplateMeta): Option<number> {
    if (this.delegate.hasHelperInScope(name, referrer)) {
      let locator = this.delegate.resolveHelper(name, referrer);
      return this.table.handleForModuleLocator(locator);
    } else {
      return null;
    }
  }

  lookupComponentDefinition(name: string, referrer: TemplateMeta): Option<number> {
    if (this.delegate.hasComponentInScope(name, referrer)) {
      let locator = this.delegate.resolveComponent(name, referrer);
      return this.table.handleForModuleLocator(locator);
    } else {
      return null;
    }
  }

  lookupModifier(name: string, referrer: TemplateMeta): Option<number> {
    if (this.delegate.hasModifierInScope(name, referrer)) {
      let locator = this.delegate.resolveModifier(name, referrer);
      return this.table.handleForModuleLocator(locator);
    } else {
      return null;
    }
  }

  lookupComponent(_name: string, _meta: TemplateMeta): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupPartial(_name: string, _meta: TemplateMeta): Option<number> {
    throw new Error("Method not implemented.");
  }
}
