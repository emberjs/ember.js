import { ASTPluginBuilder, preprocess } from '@glimmer/syntax';
import { TemplateCompiler } from '@glimmer/compiler';
import { expect, templateMeta } from '@glimmer/util';
import {
  ProgramSymbolTable,
  ModuleLocator,
  TemplateLocator,
  CompilableProgram,
  CompilableTemplate,
  SerializedHeap,
  ConstantPool,
  SerializedTemplateBlock,
  CompileMode,
  WholeProgramCompilationContext,
  STDLib,
  CompileTimeHeap,
  SyntaxCompilationContext,
  CompileTimeConstants,
  Macros,
} from '@glimmer/interfaces';
import { compileStd, compilable, MacrosImpl } from '@glimmer/opcode-compiler';

import ModuleLocatorMap from './module-locator-map';
import DebugConstants from './debug-constants';
import ExternalModuleTable from './external-module-table';
import BundleCompilerDelegate from './delegate';
import BundleCompilerLookup from './lookup';
import { CompileTimeHeapImpl } from '@glimmer/program';
import { syntaxCompilationContext } from '@glimmer/opcode-compiler';

export interface BundleCompileOptions {
  plugins: ASTPluginBuilder[];
}

export interface BundleCompilerOptions {
  macros?: Macros;
  constants?: CompileTimeConstants;
  plugins?: ASTPluginBuilder[];
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

export interface PartialTemplateLocator<M> extends ModuleLocator {
  meta: M;
  kind?: 'template';
}

// to make --declaration happy
export { CompilableTemplate };

export class BundleCompilerCompilationContext<R> implements WholeProgramCompilationContext {
  readonly compilableTemplates = new ModuleLocatorMap<CompilableProgram>();
  readonly compiledBlocks = new ModuleLocatorMap<SerializedTemplateBlock, TemplateLocator<R>>();
  readonly meta = new ModuleLocatorMap<R>();

  // implement WholeProgramCompilationContext
  readonly constants: CompileTimeConstants;
  readonly resolverDelegate: BundleCompilerLookup<R> = new BundleCompilerLookup(
    this.delegate,
    this.compilableTemplates,
    this.meta
  );
  readonly heap: CompileTimeHeap = new CompileTimeHeapImpl();
  readonly mode = CompileMode.aot;
  readonly stdlib: STDLib;

  constructor(readonly delegate: BundleCompilerDelegate<R>, options: BundleCompilerOptions) {
    if (options.constants) {
      this.constants = options.constants;
    } else {
      this.constants = new DebugConstants();
    }

    this.stdlib = compileStd(this);
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
export default class BundleCompiler<R> {
  protected macros: Macros;
  protected plugins: ASTPluginBuilder[];

  private context: BundleCompilerCompilationContext<R>;

  constructor(delegate: BundleCompilerDelegate<R>, options: BundleCompilerOptions = {}) {
    this.context = new BundleCompilerCompilationContext(delegate, options);

    this.macros = options.macros || new MacrosImpl();
    this.plugins = options.plugins || [];
  }

  get syntaxContext(): SyntaxCompilationContext {
    return {
      program: this.context,
      macros: this.macros,
    };
  }

  /**
   * Adds the template source code for a component to the bundle.
   */
  add(_locator: PartialTemplateLocator<R>, templateSource: string): SerializedTemplateBlock {
    let l = normalizeLocator(_locator);

    let block = this.preprocess(templateSource);
    this.context.compiledBlocks.set(l, block);

    let layout = {
      block,
      referrer: templateMeta(l.meta),
      asPartial: false,
    };

    let template = compilable<R>(layout);

    this.addCompilableTemplate(l, template);

    return block;
  }

  /**
   * Adds a custom CompilableTemplate instance to the bundle.
   */
  addCompilableTemplate(_locator: PartialTemplateLocator<R>, template: CompilableProgram): void {
    let locator = normalizeLocator(_locator);

    this.context.meta.set(locator, locator.meta);
    this.context.compilableTemplates.set(locator, template);
  }

  /**
   * Compiles all of the templates added to the bundle. Once compilation
   * completes, the results of the compilation are returned, which includes
   * everything needed to serialize the Glimmer program into binary bytecode and
   * data segment.
   */
  compile(): BundleCompilationResult {
    let symbolTables = new ModuleLocatorMap<ProgramSymbolTable>();

    this.context.compilableTemplates.forEach((template, locator) => {
      this.compileTemplate(locator);
      symbolTables.set(locator, template.symbolTable);
    });

    return {
      main: this.context.stdlib.main,
      heap: this.context.heap.capture(this.context.stdlib) as SerializedHeap,
      pool: this.context.constants.toPool(),
      table: this.compilerResolver().getTable(),
      symbolTables,
    };
  }

  preprocess(input: string): SerializedTemplateBlock {
    let ast = preprocess(input, { plugins: { ast: this.plugins } });
    let template = TemplateCompiler.compile(ast);
    return template.toJSON();
  }

  compilerResolver(): BundleCompilerLookup<R> {
    return this.context.resolverDelegate;
  }

  /**
   * Performs the actual compilation of the template identified by the passed
   * locator into the Program. Returns the VM handle for the compiled template.
   */
  protected compileTemplate(locator: ModuleLocator): number {
    // If this locator already has an assigned VM handle, it means we've already
    // compiled it. We need to skip compiling it again and just return the same
    // VM handle.
    let vmHandle = this.compilerResolver().getHandleByLocator(locator);
    if (vmHandle !== undefined) return vmHandle;

    // It's an error to try to compile a template that wasn't first added to the
    // bundle via the add() or addCompilableTemplate() methods.
    let compilableTemplate = expect(
      this.context.compilableTemplates.get(locator),
      `Can't compile a template that wasn't already added to the bundle (${locator.name} @ ${
        locator.module
      })`
    );

    // Compile the template, which writes opcodes to the heap and returns the VM
    // handle (the address of the compiled program in the heap).
    vmHandle = compilableTemplate.compile(syntaxCompilationContext(this.context, this.macros));

    // Index the locator by VM handle and vice versa for easy lookups.
    this.compilerResolver().setHandleByLocator(locator, vmHandle);

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
function normalizeLocator<T>(l: PartialTemplateLocator<T>): TemplateLocator<T> {
  let { module, name, meta } = l;
  return {
    module,
    name,
    kind: 'template',
    meta: templateMeta(meta),
  };
}
