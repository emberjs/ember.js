import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateCompiler } from "@glimmer/compiler";
import { expect } from "@glimmer/util";
import { SerializedTemplateBlock } from "@glimmer/wire-format";
import {
  ProgramSymbolTable,
  Recast,
  VMHandle,
  Unique
} from "@glimmer/interfaces";
import {
  CompilableTemplate,
  Macros,
  OpcodeBuilderConstructor,
  CompileOptions,
  ICompilableTemplate,
  EagerOpcodeBuilder,
  TemplateOptions,
  SimpleOpcodeBuilder
} from "@glimmer/opcode-compiler";
import {
  WriteOnlyProgram,
  ConstantPool,
  SerializedHeap
} from "@glimmer/program";

import {
  ModuleLocator,
  ModuleLocatorMap,
  TemplateLocator
} from "./module-locators";
import DebugConstants from "./debug-constants";
import ExternalModuleTable from "./external-module-table";
import CompilerDelegate from "./compiler-delegate";
import CompilerResolver from "./compiler-resolver";

export interface BundleCompileOptions {
  plugins: ASTPluginBuilder[];
}

export interface BundleCompilerOptions {
  macros?: Macros;
  Builder?: OpcodeBuilderConstructor;
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
}

export interface PartialTemplateLocator<TemplateMeta> extends ModuleLocator {
  meta?: TemplateMeta;
  kind?: 'template';
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
export default class BundleCompiler<TemplateMeta> {
  public compilableTemplates = new ModuleLocatorMap<
    ICompilableTemplate<ProgramSymbolTable>
  >();
  public compiledBlocks = new ModuleLocatorMap<SerializedTemplateBlock, TemplateLocator<TemplateMeta>>();
  public meta = new ModuleLocatorMap<TemplateMeta>();

  protected delegate: CompilerDelegate<TemplateMeta>;
  protected macros: Macros;
  protected Builder: OpcodeBuilderConstructor;
  protected plugins: ASTPluginBuilder[];
  protected program: WriteOnlyProgram;
  protected templateOptions: TemplateOptions<TemplateMeta>;
  protected table = new ExternalModuleTable();

  constructor(delegate: CompilerDelegate<TemplateMeta>, options: BundleCompilerOptions = {}) {
    this.delegate = delegate;
    this.macros = options.macros || new Macros();
    this.Builder =
      options.Builder || (EagerOpcodeBuilder as OpcodeBuilderConstructor);
    this.program =
      options.program || new WriteOnlyProgram(new DebugConstants());
    this.plugins = options.plugins || [];
  }

  /**
   * Adds the template source code for a component to the bundle.
   */
  add(_locator: PartialTemplateLocator<TemplateMeta>, templateSource: string): SerializedTemplateBlock {
    let locator = normalizeLocator(_locator);
    let { meta } = locator;

    let block = this.preprocess(meta || null, templateSource);
    this.compiledBlocks.set(locator, block);

    let compileOptions = this.compileOptions(locator);
    let compilableTemplate = CompilableTemplate.topLevel(block, compileOptions);

    this.addCompilableTemplate(locator, compilableTemplate);

    return block;
  }

  /**
   * Adds a custom CompilableTemplate instance to the bundle.
   */
  addCompilableTemplate(
    _locator: PartialTemplateLocator<TemplateMeta>,
    template: ICompilableTemplate<ProgramSymbolTable>
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
    let builder = new SimpleOpcodeBuilder();
    builder.main();
    let main = builder.commit(this.program.heap, 0);

    this.compilableTemplates.forEach((_, locator) => {
      this.compileTemplate(locator);
    });

    let { heap, constants } = this.program;

    return {
      main: main as Recast<Unique<"Handle">, number>,
      heap: heap.capture() as SerializedHeap,
      pool: constants.toPool(),
      table: this.table
    };
  }

  preprocess(
    meta: TemplateMeta | null,
    input: string
  ): SerializedTemplateBlock {
    let ast = preprocess(input, { plugins: { ast: this.plugins } });
    let template = TemplateCompiler.compile({ meta }, ast);
    return template.toJSON();
  }

  compileOptions(
    locator: TemplateLocator<TemplateMeta>,
    asPartial = false
  ): CompileOptions<TemplateMeta> {
    let templateOptions = this.templateOptions;
    if (!templateOptions) {
      let { program, macros, Builder } = this;
      let resolver = new CompilerResolver<TemplateMeta>(this.delegate, this.table, this);
      templateOptions = this.templateOptions = {
        program,
        macros,
        Builder,
        resolver
      };
    }

    return { ...templateOptions, asPartial, referrer: locator.meta };
  }

  /**
   * Performs the actual compilation of the template identified by the passed
   * locator into the Program. Returns the VM handle for the compiled template.
   */
  protected compileTemplate(locator: ModuleLocator): VMHandle {
    // If this locator already has an assigned VM handle, it means we've already
    // compiled it. We need to skip compiling it again and just return the same
    // VM handle.
    let vmHandle = this.table.vmHandleByModuleLocator.get(locator) as Recast<
      number,
      VMHandle
    >;
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
    this.table.byVMHandle.set(vmHandle as Recast<VMHandle, number>, locator);
    this.table.vmHandleByModuleLocator.set(locator, vmHandle as Recast<
      VMHandle,
      number
    >);

    // We also make sure to assign a non-VM application handle to every
    // top-level component as well, so any associated component classes appear
    // in the module map.
    this.table.handleForModuleLocator(locator);

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
