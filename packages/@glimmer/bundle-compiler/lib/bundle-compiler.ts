import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateCompiler } from "@glimmer/compiler";
import { expect } from "@glimmer/util";
import { SerializedTemplateBlock } from "@glimmer/wire-format";
import {
  ProgramSymbolTable,
  Recast,
  VMHandle,
  Unique,
  ModuleLocator,
  TemplateLocator,
  CompilableProgram,
  CompilableTemplate,
  CompileTimeLookup,
  LayoutWithContext
} from "@glimmer/interfaces";
import {
  CompilableProgram as CompilableProgramInstance,
  Macros,
  OpcodeBuilderConstructor,
  EagerOpcodeBuilder,
  AbstractCompiler
} from "@glimmer/opcode-compiler";
import {
  WriteOnlyProgram,
  ConstantPool,
  SerializedHeap
} from "@glimmer/program";

import ModuleLocatorMap from "./module-locator-map";
import DebugConstants from "./debug-constants";
import ExternalModuleTable from "./external-module-table";
import BundleCompilerDelegate from "./delegate";
import BundleCompilerLookup from "./lookup";

export interface BundleCompileOptions {
  plugins: ASTPluginBuilder[];
}

export interface BundleCompilerOptions {
  macros?: Macros;
  plugins?: ASTPluginBuilder[];
  program?: WriteOnlyProgram;
}

/**
 * Represents the results of a bundle compilation.
 */
export interface BundleCompilationResult {
  /**
   * The VM handle corresponding to the program entry point. This is the heap
   * offset where execution will begin when the program starts.
   */
  main: number;

  /**
   * The final result of program compilation, including the binary bytecode.
   */
  heap: SerializedHeap;

  /**
   * A JSON-ready data structure containing constant values generated during
   * compilation.
   */
  pool: ConstantPool;

  /**
   * A table mapping modules locators to their associated handles, and vice
   * versa.
   */
  table: ExternalModuleTable;

  /**
   * A mapping of module locators to compiled template symbol tables.
   */
  symbolTables: ModuleLocatorMap<ProgramSymbolTable>;
}

export interface PartialTemplateLocator<Locator> extends ModuleLocator {
  meta?: Locator;
  kind?: 'template';
}

// to make --declaration happy
export { CompilableTemplate };

export class EagerCompiler<Locator> extends AbstractCompiler<Locator, EagerOpcodeBuilder<Locator>> {
  program: WriteOnlyProgram;

  // FIXME
  constructor(
    macros: Macros,
    program: WriteOnlyProgram,
    resolver: CompileTimeLookup<Locator>
  ) {
    super(macros, program, resolver);
  }

  builderFor(containingLayout: LayoutWithContext<Locator>): EagerOpcodeBuilder<Locator> {
    return new EagerOpcodeBuilder(this, containingLayout);
  }
}

/**
 * The BundleCompiler is used to compile all of the component templates in a
 * Glimmer program into binary bytecode.
 *
 * First, you must call `add()` to push each component's template into the
 * bundle. Once every template in the program has been registered, the last step
 * is to call `compile()`, which begins eager compilation of the entire program
 * into the heap.
 *
 * At the end of compilation, the heap plus additional metadata is produced,
 * which is suitable for serialization into bytecode and JavaScript assets that
 * can be loaded and run in the browser.
 */
export default class BundleCompiler<Locator> {
  public compilableTemplates = new ModuleLocatorMap<CompilableProgram>();
  public compiledBlocks = new ModuleLocatorMap<SerializedTemplateBlock, TemplateLocator<Locator>>();
  public meta = new ModuleLocatorMap<Locator>();
  public compiler: EagerCompiler<Locator>;

  protected delegate: BundleCompilerDelegate<Locator>;
  protected macros: Macros;
  protected Builder: OpcodeBuilderConstructor;
  protected plugins: ASTPluginBuilder[];
  protected resolver: BundleCompilerLookup<Locator>;

  constructor(delegate: BundleCompilerDelegate<Locator>, options: BundleCompilerOptions = {}) {
    this.delegate = delegate;
    let macros = this.macros = options.macros || new Macros();

    let program = options.program || new WriteOnlyProgram(new DebugConstants());
    this.plugins = options.plugins || [];

    this.compiler = new EagerCompiler(macros, program, this.compilerResolver());
  }

  /**
   * Adds the template source code for a component to the bundle.
   */
  add(_locator: PartialTemplateLocator<Locator>, templateSource: string): SerializedTemplateBlock {
    let locator = normalizeLocator(_locator);
    let { meta } = locator;

    let block = this.preprocess(meta || null, templateSource);
    this.compiledBlocks.set(locator, block);

    let template = new CompilableProgramInstance(this.compiler, {
      block,
      referrer: locator.meta,
      asPartial: false
    });

    this.addCompilableTemplate(locator, template);

    return block;
  }

  /**
   * Adds a custom CompilableTemplate instance to the bundle.
   */
  addCompilableTemplate(
    _locator: PartialTemplateLocator<Locator>,
    template: CompilableProgram
  ): void {
    let locator = normalizeLocator(_locator);

    this.meta.set(locator, locator.meta);
    this.compilableTemplates.set(locator, template);
  }

  /**
   * Compiles all of the templates added to the bundle. Once compilation
   * completes, the results of the compilation are returned, which includes
   * everything needed to serialize the Glimmer program into binary bytecode and
   * data segment.
   */
  compile(): BundleCompilationResult {
    let { main } = this.compiler.stdLib;
    let symbolTables = new ModuleLocatorMap<ProgramSymbolTable>();

    this.compilableTemplates.forEach((template, locator) => {
      this.compileTemplate(locator);
      symbolTables.set(locator, template.symbolTable);
    });

    let { heap, constants } = this.compiler.program;

    return {
      main: main as Recast<Unique<"Handle">, number>,
      heap: heap.capture() as SerializedHeap,
      pool: constants.toPool(),
      table: this.resolver.getTable(),
      symbolTables
    };
  }

  preprocess(
    meta: Locator | null,
    input: string
  ): SerializedTemplateBlock {
    let ast = preprocess(input, { plugins: { ast: this.plugins } });
    let template = TemplateCompiler.compile({ meta }, ast);
    return template.toJSON();
  }

  compilerResolver(): CompileTimeLookup<Locator> {
    let resolver = this.resolver;
    if (!resolver) {
      resolver = this.resolver = new BundleCompilerLookup<Locator>(this.delegate, this);
    }

    return resolver;
  }

  /**
   * Performs the actual compilation of the template identified by the passed
   * locator into the Program. Returns the VM handle for the compiled template.
   */
  protected compileTemplate(locator: ModuleLocator): number {
    // If this locator already has an assigned VM handle, it means we've already
    // compiled it. We need to skip compiling it again and just return the same
    // VM handle.
    let vmHandle = this.resolver.getTable().vmHandleByModuleLocator.get(locator);
    if (vmHandle) return vmHandle;

    // It's an error to try to compile a template that wasn't first added to the
    // bundle via the add() or addCompilableTemplate() methods.
    let compilableTemplate = expect(
      this.compilableTemplates.get(locator),
      `Can't compile a template that wasn't already added to the bundle (${locator.name} @ ${locator.module})`
    );

    // Compile the template, which writes opcodes to the heap and returns the VM
    // handle (the address of the compiled program in the heap).
    vmHandle = compilableTemplate.compile();

    // Index the locator by VM handle and vice versa for easy lookups.
    this.resolver.getTable().byVMHandle.set(vmHandle as Recast<VMHandle, number>, locator);
    this.resolver.getTable().vmHandleByModuleLocator.set(locator, vmHandle as Recast<
      VMHandle,
      number
    >);

    // We also make sure to assign a non-VM application handle to every
    // top-level component as well, so any associated component classes appear
    // in the module map.
    this.resolver.getTable().handleForModuleLocator(locator);

    return vmHandle;
  }
}

/**
 * For developer convenience, we allow users to pass partially populated
 * TemplateLocator objects as identifiers for a given template. Because it is
 * always a TemplateLocator added to a bundle, we can populate missing fields
 * like the `kind` with the appropriate value and avoid boilerplate on the part
 * of API consumers.
 */
function normalizeLocator<T>(locator: PartialTemplateLocator<T>): TemplateLocator<T> {
  let { module, name, meta } = locator;
  return {
    module,
    name,
    kind: 'template',
    meta: meta || {} as T
  };
}
