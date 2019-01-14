import CompilerDelegate from './delegate';
import ExternalModuleTable from './external-module-table';
import {
  ComponentCapabilities,
  CompilableProgram,
  CompileTimeResolverDelegate,
  ModuleLocator,
  TemplateMeta,
  CompileTimeComponent,
  Template,
} from '@glimmer/interfaces';
import { expect, Option, templateMeta } from '@glimmer/util';
import { ModuleLocatorMap } from '..';
import { preprocess } from '@glimmer/opcode-compiler';

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
export default class BundleCompilerLookup<R> implements CompileTimeResolverDelegate {
  private table = new ExternalModuleTable();

  constructor(
    private delegate: CompilerDelegate<R>,
    private compilableTemplates: ModuleLocatorMap<CompilableProgram>,
    private meta: ModuleLocatorMap<R>
  ) {}

  resolve(handle: number): TemplateMeta<ModuleLocator> {
    let l = expect(this.table.byHandle.get(handle), `Passed an invalid handle to resolve`);
    return templateMeta(l);
  }

  getTable(): ExternalModuleTable {
    return this.table;
  }

  getHandleByLocator(locator: ModuleLocator): number | undefined {
    return this.table.vmHandleByModuleLocator.get(locator);
  }

  setHandleByLocator(locator: ModuleLocator, handle: number): void {
    this.table.byVMHandle.set(handle, locator);
    this.table.vmHandleByModuleLocator.set(locator, handle);

    // We also make sure to assign a non-VM application handle to every
    // top-level component as well, so any associated component classes appear
    // in the module map.
    this.table.handleForModuleLocator(locator);
  }

  getCapabilities(handle: number): ComponentCapabilities {
    let l = expect(
      this.table.byHandle.get(handle),
      `BUG: Shouldn't call getCapabilities if a handle has no associated locator`
    );
    let meta = expect(this.meta.get(l), `could not find template metadata for module ${l.module}`);
    return this.delegate.getComponentCapabilities(templateMeta(meta));
  }

  getLayout(handle: number): Option<CompilableProgram> {
    let locator = expect(
      this.table.byHandle.get(handle),
      `BUG: Shouldn't call getLayout if a handle has no associated locator`
    );
    return this.compilableTemplates.get(locator) || null;
  }

  lookupHelper(name: string, referrer: TemplateMeta<R>): Option<number> {
    if (this.delegate.hasHelperInScope(name, referrer)) {
      let locator = this.delegate.resolveHelper(name, referrer);
      return this.table.handleForModuleLocator(locator);
    } else {
      return null;
    }
  }

  lookupComponent(name: string, referrer: Option<TemplateMeta<R>>): Option<CompileTimeComponent> {
    if (referrer === null) {
      return null;
    } else if (this.delegate.hasComponentInScope(name, referrer)) {
      let locator = this.delegate.resolveComponent(name, referrer);
      let handle = this.table.handleForModuleLocator(locator);
      let capabilities = this.getCapabilities(handle);
      let compilable = this.getLayout(handle);

      return { handle, capabilities, compilable };
    } else {
      return null;
    }
  }

  lookupModifier(name: string, referrer: R & TemplateMeta): Option<number> {
    if (this.delegate.hasModifierInScope(name, referrer)) {
      let locator = this.delegate.resolveModifier(name, referrer);
      return this.table.handleForModuleLocator(locator);
    } else {
      return null;
    }
  }

  lookupPartial(_name: string, _meta: R & TemplateMeta): Option<number> {
    throw new Error('Method not implemented.');
  }

  compile(source: string): Template {
    return preprocess(source, templateMeta({}));
  }
}
