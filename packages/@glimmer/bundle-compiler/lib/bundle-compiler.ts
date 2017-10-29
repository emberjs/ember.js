import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateCompiler } from "@glimmer/compiler";
import { expect } from "@glimmer/util";
import { SerializedTemplateBlock } from "@glimmer/wire-format";
import {
  Option,
  ProgramSymbolTable,
  Recast,
  SymbolTable,
  VMHandle,
  ComponentCapabilities,
  Unique
} from "@glimmer/interfaces";
import {
  CompilableTemplate,
  Macros,
  OpcodeBuilderConstructor,
  CompileTimeLookup,
  CompileOptions,
  ICompilableTemplate,
  EagerOpcodeBuilder,
  TemplateOptions,
  SimpleOpcodeBuilder
} from "@glimmer/opcode-compiler";
import {
  WriteOnlyProgram,
  WriteOnlyConstants,
  ConstantPool,
  SerializedHeap
} from "@glimmer/program";

import { Specifier } from "./specifiers";
import { SpecifierMap } from "./specifier-map";
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

export class DebugConstants extends WriteOnlyConstants {
  getFloat(value: number): number {
    return this.floats[value];
  }

  getNegative(value: number): number {
    return this.negatives[value];
  }

  getString(value: number): string {
    return this.strings[value];
  }

  getStringArray(value: number): string[] {
    let names = this.getArray(value);
    let _names: string[] = new Array(names.length);

    for (let i = 0; i < names.length; i++) {
      let n = names[i];
      _names[i] = this.getString(n);
    }

    return _names;
  }

  getArray(value: number): number[] {
    return (this.arrays as number[][])[value];
  }

  getSymbolTable<T extends SymbolTable>(value: number): T {
    return this.tables[value] as T;
  }

  resolveHandle<T>(s: number): T {
    return { handle: s } as any as T;
  }

  getSerializable<T>(s: number): T {
    return this.serializables[s] as T;
  }
}

export class BundleCompiler {
  protected delegate: CompilerDelegate;
  protected macros: Macros;
  protected Builder: OpcodeBuilderConstructor;
  protected plugins: ASTPluginBuilder[];
  private program: WriteOnlyProgram;
  private _templateOptions: TemplateOptions<Specifier>;

  private specifiers = new SpecifierMap();
  public compiledBlocks = new Map<Specifier, AddedTemplate>();

  constructor(delegate: CompilerDelegate, options: BundleCompilerOptions = {}) {
    this.delegate = delegate;
    this.macros = options.macros || new Macros();
    this.Builder = options.Builder || EagerOpcodeBuilder as OpcodeBuilderConstructor;
    this.program = options.program || new WriteOnlyProgram(new DebugConstants());
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

    this.compiledBlocks.set(specifier, block);
    return block;
  }

  addCustom(specifier: Specifier, input: ICompilableTemplate<ProgramSymbolTable>): void {
    this.compiledBlocks.set(specifier, input);
  }

  compile() {
    let builder = new SimpleOpcodeBuilder();
    builder.main();
    let main = builder.commit(this.program.heap, 0);

    this.compiledBlocks.forEach((_block, specifier) => {
      this.compileSpecifier(specifier);
    });

    let { heap, constants } = this.program;

    return {
      main: main as Unique<'Handle'>,
      heap: heap.capture() as SerializedHeap,
      pool: constants.toPool()
    };
  }

  compileOptions(specifier: Specifier, asPartial = false): CompileOptions<Specifier> {
    let templateOptions = this._templateOptions;
    if (!templateOptions) {
      let { program, macros, Builder } = this;
      let lookup = new BundlingLookup(this.delegate, this.specifiers, this);
      templateOptions = this._templateOptions = {
        program,
        macros,
        Builder,
        lookup
      };
    }

    return { ...templateOptions, asPartial, referrer: specifier };
  }

  compileSpecifier(specifier: Specifier): VMHandle {
    let handle = this.specifiers.vmHandleBySpecifier.get(specifier) as Recast<number, VMHandle>;
    if (handle) return handle;

    let block = expect(this.compiledBlocks.get(specifier), `Can't compile a template that wasn't already added (${specifier.name} @ ${specifier.module})`);

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
  constructor(private delegate: CompilerDelegate, private map: SpecifierMap, private compiler: BundleCompiler) { }

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
    let block = this.compiler.compiledBlocks.get(specifier);

    if (block && isCompilableTemplate(block)) {
      return block;
    }

    expect(block, 'Should have a SerializedTemplateBlock');

    block = this.delegate.getComponentLayout(specifier, block!, this.compiler.compileOptions(specifier));

    this.compiler.compiledBlocks.set(specifier, block);

    return block;
  }

  lookupHelper(name: string, referrer: Specifier): Option<number> {
    if (this.delegate.hasHelperInScope(name, referrer)) {
      let specifier = this.delegate.resolveHelperSpecifier(name, referrer);
      return this.registerSpecifier(specifier);
    } else {
      return null;
    }
  }

  lookupComponentSpec(name: string, referrer: Specifier): Option<number> {
    if (this.delegate.hasComponentInScope(name, referrer)) {
      let specifier = this.delegate.resolveComponentSpecifier(name, referrer);
      return this.registerSpecifier(specifier);
    } else {
      return null;
    }
  }

  lookupModifier(name: string, referrer: Specifier): Option<number> {
    if (this.delegate.hasModifierInScope(name, referrer)) {
      let specifier = this.delegate.resolveModifierSpecifier(name, referrer);
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
