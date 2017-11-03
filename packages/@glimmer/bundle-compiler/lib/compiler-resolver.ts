import { CompileTimeLookup, ICompilableTemplate } from "@glimmer/opcode-compiler";

import { ModuleLocator, TemplateLocator } from './module-locators';
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
export default class CompilerResolver<Meta> implements CompileTimeLookup<TemplateLocator<Meta>> {
  constructor(private delegate: CompilerDelegate, private map: ExternalModuleTable, private compiler: BundleCompiler) { }

  getCapabilities(handle: number): ComponentCapabilities {
    let locator = expect(this.map.byHandle.get(handle), `BUG: Shouldn't call getCapabilities if a handle has no associated locator`);
    return this.delegate.getComponentCapabilities(locator);
  }

  getLayout(handle: number): Option<ICompilableTemplate<ProgramSymbolTable>> {
    let locator = expect(this.map.byHandle.get(handle), `BUG: Shouldn't call getLayout if a handle has no associated locator`);
    return this.compiler.compilableTemplates.get(locator) || null;
  }

  lookupHelper(name: string, referrer: TemplateLocator<Meta>): Option<number> {
    if (this.delegate.hasHelperInScope(name, referrer)) {
      let locator = this.delegate.resolveHelper(name, referrer);
      return this.handleForLocator(locator);
    } else {
      return null;
    }
  }

  lookupComponentDefinition(name: string, referrer: TemplateLocator<Meta>): Option<number> {
    if (this.delegate.hasComponentInScope(name, referrer)) {
      let locator = this.delegate.resolveComponent(name, referrer);
      return this.handleForLocator(locator);
    } else {
      return null;
    }
  }

  lookupModifier(name: string, referrer: TemplateLocator<Meta>): Option<number> {
    if (this.delegate.hasModifierInScope(name, referrer)) {
      let locator = this.delegate.resolveModifier(name, referrer);
      return this.handleForLocator(locator);
    } else {
      return null;
    }
  }

  lookupComponent(_name: string, _meta: TemplateLocator<Meta>): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupPartial(_name: string, _meta: TemplateLocator<Meta>): Option<number> {
    throw new Error("Method not implemented.");
  }

  /**
   * Returns the handle (unique integer id) for the provided module locator. If
   * the locator has not been seen before, a new handle is assigned. Otherwise,
   * the same handle is always returned for a given locator.
   */
  private handleForLocator(locator: ModuleLocator): number {
    let { byModuleLocator, byHandle } = this.map;

    let handle = byModuleLocator.get(locator);

    if (handle === undefined) {
      handle = byHandle.size;
      byHandle.set(handle, locator);
      byModuleLocator.set(locator, handle);
    }

    return handle;
  }
}
