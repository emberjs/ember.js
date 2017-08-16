import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateCompiler } from "@glimmer/compiler";
import { CompilableTemplate, Macros, OpcodeBuilderConstructor, ComponentCapabilities, CompileTimeLookup, CompileOptions, VMHandle } from "@glimmer/opcode-compiler";
import { WriteOnlyProgram, WriteOnlyConstants } from "@glimmer/program";
import { Option, ProgramSymbolTable, Recast } from "@glimmer/interfaces";
import { SerializedTemplateBlock } from "@glimmer/wire-format";
import { expect } from "@glimmer/util";

export interface BundleCompileOptions {
  plugins: ASTPluginBuilder[];
}

export type ModuleName = string;
export type NamedExport = string;

export interface Specifier {
  module: NamedExport;
  name: ModuleName;
}

export class SpecifierMap {
  public bySpecifier = new Map<Specifier, number>();
  public byHandle = new Map<number, Specifier>();

  public byVMHandle = new Map<number, Specifier>();
  public vmHandleBySpecifier = new Map<Specifier, number>();
}

export class BundleCompiler {
  private specifiers = new SpecifierMap();
  private firstPass = new Map<Specifier, SerializedTemplateBlock>();

  constructor(
    protected macros: Macros,
    protected Builder: OpcodeBuilderConstructor,
    protected delegate: CompilerDelegate,
    private program: WriteOnlyProgram = new WriteOnlyProgram(new WriteOnlyConstants()),
    protected plugins: ASTPluginBuilder[] = []
  ) {}

  getSpecifierMap(): SpecifierMap {
    return this.specifiers;
  }

  add(input: string, specifier: Specifier): void {
    let ast = preprocess(input, { plugins: { ast: this.plugins } });
    let template = TemplateCompiler.compile({ meta: specifier }, ast);
    let block = template.toJSON();

    this.firstPass.set(specifier, block);
  }

  compile(specifier: Specifier): void {
    let block = expect(this.firstPass.get(specifier), `Can't compile a template that wasn't already added (${specifier.name} @ ${specifier.module})`);

    let { program, macros, Builder } = this;
    let lookup = new BundlingLookup(this.delegate, this.specifiers);

    let options: CompileOptions<Specifier> = {
      program,
      macros,
      Builder,
      lookup,
      referer: specifier,
      asPartial: false
    };

    let compilable = CompilableTemplate.topLevel(block, options);

    let handle = compilable.compile() as Recast<VMHandle, number>;

    this.specifiers.byVMHandle.set(handle as Recast<VMHandle, number>, specifier);
    this.specifiers.vmHandleBySpecifier.set(specifier, handle as Recast<VMHandle, number>);
  }
}

export interface CompilerDelegate {
  /**
   * During compilation, the compiler will ask the delegate about each component
   * invocation found in the passed template. If the component exists in scope,
   * the delegate should return `true`. If the component does not exist in
   * scope, return `false`. (Note that returning `false` will cause the
   * compilation process to fail.)
   */
  hasComponentInScope(componentName: string, referrer: Specifier): boolean;

  /**
   * If the delegate returns `true` from `hasComponentInScope()`, the compiler
   * will next ask the delegate to turn the relative specifier into an
   * globally-unique absolute specifier. By providing this unique identifier,
   * the compiler avoids having to compile the same component multiple times if
   * invoked from different locations.
   */
  resolveComponentSpecifier(componentName: string, referrer: Specifier): Specifier;

  /**
   * This method is called with the return value of `resolveComponentSpecifier` and
   * it produces a statically known list of required capabilities.
   */
  getComponentCapabilities(specifier: Specifier): ComponentCapabilities;

  hasHelperInScope(helperName: string, referer: Specifier): boolean;
  resolveHelperSpecifier(helperName: string, referer: Specifier): Specifier;

  hasModifierInScope(modifierName: string, referer: Specifier): boolean;
  resolveModifierSpecifier(modifierName: string, referer: Specifier): Specifier;

  hasPartialInScope(partialName: string, referer: Specifier): boolean;
  resolvePartialSpecifier(partialName: string, referer: Specifier): Specifier;
}

class BundlingLookup implements CompileTimeLookup<Specifier> {
  constructor(private delegate: CompilerDelegate, private map: SpecifierMap) { }

  private registerSpecifier(specifier: Specifier): number {
    let { bySpecifier, byHandle } = this.map;

    let handle = bySpecifier.get(specifier);

    if (handle === undefined) {
      handle = byHandle.size;
      byHandle.set(handle, specifier);
      bySpecifier.set(specifier, handle);
    }

    return handle;
  }

  getCapabilities(handle: number): ComponentCapabilities {
    let specifier = expect(this.map.byHandle.get(handle), `BUG: Shouldn't call getCapabilities if a handle has no associated specifier`);
    return this.delegate.getComponentCapabilities(specifier);
  }

  getLayout(handle: number): Option<CompilableTemplate<ProgramSymbolTable, Specifier>> {
    throw new Error("Method not implemented.");
  }

  lookupHelper(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasHelperInScope(name, referer)) {
      let specifier =  this.delegate.resolveHelperSpecifier(name, referer);
      return this.registerSpecifier(specifier);
    } else {
      return null;
    }
  }

  lookupComponentSpec(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasComponentInScope(name, referer)) {
      let specifier =  this.delegate.resolveHelperSpecifier(name, referer);
      return this.registerSpecifier(specifier);
    } else {
      return null;
    }
  }

  lookupModifier(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasModifierInScope(name, referer)) {
      let specifier = this.delegate.resolveModifierSpecifier(name, referer);
      return this.registerSpecifier(specifier);
    } else {
      return null;
    }
  }

  lookupComponent(name: string, meta: Specifier): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupPartial(name: string, meta: Specifier): Option<number> {
    throw new Error("Method not implemented.");
  }
}
