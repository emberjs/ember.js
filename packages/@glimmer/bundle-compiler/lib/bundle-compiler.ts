import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateCompiler } from "@glimmer/compiler";
import { expect } from "@glimmer/util";
import { SerializedTemplateBlock } from "@glimmer/wire-format";
import {
  Option,
  ProgramSymbolTable,
  Recast,
} from "@glimmer/interfaces";
import {
  CompilableTemplate,
  Macros,
  OpcodeBuilderConstructor,
  ComponentCapabilities,
  CompileTimeLookup,
  CompileOptions,
  VMHandle,
  ICompilableTemplate,
  EagerOpcodeBuilder
} from "@glimmer/opcode-compiler";
import {
  WriteOnlyProgram,
  WriteOnlyConstants,
  ConstantPool
} from "@glimmer/program";

import { Specifier } from "./specifiers";
import { SpecifierMap, LookupMap } from "./specifier-map";
import { CompilerDelegate } from "./compiler-delegate";

export interface BundleCompileOptions {
  plugins: ASTPluginBuilder[];
}

export interface BundleCompilerOptions {
  macros?: Macros;
  Builder?: OpcodeBuilderConstructor;
  plugins?: ASTPluginBuilder[];
  program?: WriteOnlyProgram;
}

export interface BundleCompilationResult {
  heap: number[];
  pool: ConstantPool;
}

export class BundleCompiler {
  protected delegate: CompilerDelegate;
  protected macros: Macros;
  protected Builder: OpcodeBuilderConstructor;
  protected plugins: ASTPluginBuilder[];
  private program: WriteOnlyProgram;

  private specifiers = new SpecifierMap();
  private firstPass = new LookupMap<Specifier, AddedTemplate>();

  constructor(delegate: CompilerDelegate, options: BundleCompilerOptions = {}) {
    this.delegate = delegate;
    this.macros = options.macros || new Macros();
    this.Builder = options.Builder || EagerOpcodeBuilder as OpcodeBuilderConstructor;
    this.program = options.program || new WriteOnlyProgram(new WriteOnlyConstants());
    this.plugins = options.plugins || [];
  }

  getSpecifierMap(): SpecifierMap {
    return this.specifiers;
  }

  preprocess(specifier: Specifier, input: string): SerializedTemplateBlock {
    let ast = preprocess(input, { plugins: { ast: this.plugins } });
    let template = TemplateCompiler.compile({ meta: specifier }, ast);
    return template.toJSON();
  }

  add(specifier: Specifier, input: string): SerializedTemplateBlock {
    let block = this.preprocess(specifier, input);

    this.firstPass.set(specifier, block);
    return block;
  }

  addCustom(specifier: Specifier, input: ICompilableTemplate<ProgramSymbolTable>): void {
    this.firstPass.set(specifier, input);
  }

  compile() {
    this.firstPass.forEach((_block, specifier) => {
      this.compileSpecifier(specifier);
    });

    let { heap, constants } = this.program;

    return {
      heap: heap.toArray(),
      pool: constants.toPool()
    };
  }

  compileOptions(specifier: Specifier, asPartial = false): CompileOptions<Specifier> {
    let { program, macros, Builder } = this;
    let lookup = new BundlingLookup(this.delegate, this.specifiers);

    return {
      program,
      macros,
      Builder,
      lookup,
      asPartial,
      referer: specifier
    };
  }

  compileSpecifier(specifier: Specifier): VMHandle {
    let handle = this.specifiers.vmHandleBySpecifier.get(specifier) as Recast<number, VMHandle>;
    if (handle) return handle;

    let block = expect(this.firstPass.get(specifier), `Can't compile a template that wasn't already added (${specifier.name} @ ${specifier.module})`);

    let options = this.compileOptions(specifier);

    if (isCompilableTemplate(block)) {
      handle = block.compile();
    } else {
      let compilable = CompilableTemplate.topLevel(block, options);
      handle = compilable.compile();
    }

    this.specifiers.byVMHandle.set(handle as Recast<VMHandle, number>, specifier);
    this.specifiers.vmHandleBySpecifier.set(specifier, handle as Recast<VMHandle, number>);

    return handle;
  }
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

  getLayout(handle: number): Option<ICompilableTemplate<ProgramSymbolTable>> {
    let specifier = expect(this.map.byHandle.get(handle), `BUG: Shouldn't call getLayout if a handle has no associated specifier`);
    return this.delegate.getComponentLayout(specifier);
  }

  lookupHelper(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasHelperInScope(name, referer)) {
      let specifier = this.delegate.resolveHelperSpecifier(name, referer);
      return this.registerSpecifier(specifier);
    } else {
      return null;
    }
  }

  lookupComponentSpec(name: string, referer: Specifier): Option<number> {
    if (this.delegate.hasComponentInScope(name, referer)) {
      let specifier = this.delegate.resolveComponentSpecifier(name, referer);
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

  lookupComponent(_name: string, _meta: Specifier): Option<number> {
    throw new Error("Method not implemented.");
  }

  lookupPartial(_name: string, _meta: Specifier): Option<number> {
    throw new Error("Method not implemented.");
  }
}

type AddedTemplate = SerializedTemplateBlock | ICompilableTemplate<ProgramSymbolTable>;

function isCompilableTemplate(v: AddedTemplate): v is ICompilableTemplate<ProgramSymbolTable> {
  return typeof v['compile'] === 'function';
}
