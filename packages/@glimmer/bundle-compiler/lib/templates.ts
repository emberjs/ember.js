import { SerializedTemplateBlock } from '@glimmer/wire-format';
import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateCompiler } from "@glimmer/compiler";
import { CompilableTemplate, Macros, OpcodeBuilderConstructor, ComponentCapabilities, CompileTimeLookup, CompileOptions, VMHandle, ICompilableTemplate } from "@glimmer/opcode-compiler";
import { WriteOnlyProgram, WriteOnlyConstants } from "@glimmer/program";
import { Option, ProgramSymbolTable, Recast, Dict } from "@glimmer/interfaces";
import { dict } from "@glimmer/util";

export interface BundleCompileOptions {
  plugins: ASTPluginBuilder[];
}

export type ModuleName = string;
export type NamedExport = string;

export interface Specifier extends Readonly<object> {
  module: ModuleName;
  name: NamedExport;
}

class SpecifierValue implements Specifier {
  private static values: Dict<Dict<Specifier>> = dict();

  static for(name: NamedExport, module: ModuleName): Specifier {
    let specifiers = this.values[name];

    if (!specifiers) {
      specifiers = this.values[module] = dict();
    }

    let specifier = specifiers[name];

    if (!specifier) {
      specifier = { name, module };
    }

    return Object.freeze(specifier);
  }

  private constructor(public name: NamedExport, public module: ModuleName) {}
}

export function specifier(name: NamedExport, module: ModuleName): Specifier {
  return SpecifierValue.for(name, module);
}

export class SpecifierMap {
  public helpers = new Map<number, Specifier>();
  public modifiers = new Map<number, Specifier>();
  public components = new Map<number, Specifier>();

  private helpersBySpecifier = new Map<Specifier, number>();
  private modifiersBySpecifier = new Map<Specifier, number>();
  private componentsBySpecifier = new Map<Specifier, number>();

  private handleFor(handles: Map<Specifier, number>, specifier:  Specifier): number {
    let handle = handles.get(specifier);

    if (!handle) {
      handle = handles.size;
      handles.set(specifier, handle);
    }

    return handle;
  }

  handleForHelper(helper: Specifier): number {
    return this.handleFor(this.helpersBySpecifier, helper);
  }

  handleForModifier(modifier: Specifier): number {
    return this.handleFor(this.modifiersBySpecifier, modifier);
  }

  handleForComponent(component: Specifier): number {
    return this.handleFor(this.componentsBySpecifier, component);
  }
}

export class BundleCompiler {
  private program = new WriteOnlyProgram(new WriteOnlyConstants());
  public specifiers = new SpecifierMap();

  constructor(
    protected plugins: ASTPluginBuilder[] = [],
    protected macros: Macros,
    protected Builder: OpcodeBuilderConstructor<Specifier>,
    protected delegate: CompilerDelegate
  ) {}

  compile(input: string, specifier: Specifier, delegate: CompilerDelegate): { symbolTable: ProgramSymbolTable, handle: number } {
    let ast = preprocess(input, { plugins: { ast: this.plugins } });
    let template = TemplateCompiler.compile({ meta: null }, ast);
    let block = template.toJSON();

    let { program, macros, Builder } = this;
    let lookup = new BundlingLookup(delegate, this.specifiers);

    let options: CompileOptions<Specifier> = {
      program,
      macros,
      Builder,
      lookup,
      asPartial: false
    };

    lookup.options = options;

    let compilable = CompilableTemplate.topLevel(block, options);

    let handle = compilable.compile() as Recast<VMHandle, number>;

    this.specifiers.components.set(handle, specifier);

    return { handle, symbolTable: compilable.symbolTable };
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

  getComponentLayout(specifier: Specifier): SerializedTemplateBlock;

  hasHelperInScope(helperName: string, referer: Specifier): boolean;
  resolveHelperSpecifier(helperName: string, referer: Specifier): Specifier;

  hasModifierInScope(modifierName: string, referer: Specifier): boolean;
  resolveModifierSpecifier(modifierName: string, referer: Specifier): Specifier;

  hasPartialInScope(partialName: string, referer: Specifier): boolean;
  resolvePartialSpecifier(partialName: string, referer: Specifier): Specifier;
}

class BundlingLookup implements CompileTimeLookup<Specifier> {
  public options: CompileOptions<Specifier>;

  constructor(private delegate: CompilerDelegate, private specifiers: SpecifierMap) {}

  lookupComponentSpec(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasComponentInScope(name, referer)) {
      let specifier = this.delegate.resolveComponentSpecifier(name, referer);
      return this.specifiers.handleForComponent(specifier);
    } else {
      return null;
    }
  }

  getCapabilities(handle: number): ComponentCapabilities {
    let specifier = this.specifiers.components.get(handle)!;
    return this.delegate.getComponentCapabilities(specifier);
  }

  getLayout(handle: number): Option<ICompilableTemplate<ProgramSymbolTable>> {
    let specifier = this.specifiers.components.get(handle)!;
    let block = this.delegate.getComponentLayout(specifier);

    return CompilableTemplate.topLevel(block, this.options);
  }

  lookupHelper(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasHelperInScope(name, referer)) {
      let specifier = this.delegate.resolveHelperSpecifier(name, referer);
      return this.specifiers.handleForHelper(specifier);
    } else {
      return null;
    }
  }

  lookupModifier(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasModifierInScope(name, referer)) {
      let specifier = this.delegate.resolveHelperSpecifier(name, referer);
      return this.specifiers.handleForHelper(specifier);
    } else {
      return null;
    }
  }

  lookupPartial(_name: string, _referer: Specifier): Option<number> {
    throw new Error("Method not implemented.");
  }
}
