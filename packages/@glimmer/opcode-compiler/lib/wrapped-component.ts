import {
  ATTRS_BLOCK,
  ComponentCapabilities,
  ICompilableTemplate,
  LazyOpcodeBuilder,
  OpcodeBuilder,
  debugSlice
} from '@glimmer/opcode-compiler';
import { Register } from '@glimmer/vm';
import { ProgramSymbolTable, Opaque, BlockSymbolTable } from '@glimmer/interfaces';
import { TemplateMeta } from '@glimmer/wire-format';

import {
  Handle,
  ComponentArgs,
  ComponentBuilder as IComponentBuilder,
  ParsedLayout,
  Specifier
} from './interfaces';

import { CompileOptions } from './syntax';
import CompilableTemplate from './compilable-template';

import { DEBUG } from "@glimmer/local-debug-flags";
import { EMPTY_ARRAY } from "@glimmer/util";

export class WrappedBuilder implements ICompilableTemplate<ProgramSymbolTable> {
  public symbolTable: ProgramSymbolTable;
  private meta: TemplateMeta;

  constructor(public options: CompileOptions, private layout: ParsedLayout, private capabilities: ComponentCapabilities) {
    let { block } = layout;
    this.meta = layout.meta;
    let meta = this.meta = { templateMeta: layout.meta, symbols: block.symbols, asPartial: false };

    this.symbolTable = {
      meta,
      hasEval: block.hasEval,
      symbols: block.symbols.concat([ATTRS_BLOCK])
    };
  }

  compile(): Handle {
    //========DYNAMIC
    //        PutValue(TagExpr)
    //        Test
    //        JumpUnless(BODY)
    //        OpenDynamicPrimitiveElement
    //        DidCreateElement
    //        ...attr statements...
    //        FlushElement
    // BODY:  Noop
    //        ...body statements...
    //        PutValue(TagExpr)
    //        Test
    //        JumpUnless(END)
    //        CloseElement
    // END:   Noop
    //        DidRenderLayout
    //        Exit
    //
    //========STATIC
    //        OpenPrimitiveElementOpcode
    //        DidCreateElement
    //        ...attr statements...
    //        FlushElement
    //        ...body statements...
    //        CloseElement
    //        DidRenderLayout
    //        Exit

    let { options, layout, meta } = this;
    let { program, lookup, macros, asPartial } = options;

    let b: LazyOpcodeBuilder = new LazyOpcodeBuilder(program, lookup, meta, macros, layout, asPartial);

    b.startLabels();

    if (this.capabilities.dynamicTag) {
      b.fetch(Register.s1);

      b.getComponentTagName(Register.s0);
      b.primitiveReference();

      b.dup();
      b.load(Register.s1);

      b.jumpUnless('BODY');

      b.fetch(Register.s1);
      b.putComponentOperations();
      b.openDynamicElement();
      b.didCreateElement(Register.s0);
      b.flushElement();

      b.label('BODY');
    }

    b.invokeStaticBlock(blockFor(layout, this.options));

    if (this.capabilities.dynamicTag) {
      b.fetch(Register.s1);
      b.jumpUnless('END');
      b.closeElement();

      b.label('END');
      b.load(Register.s1);

      b.stopLabels();
    }

    let handle = b.commit(options.program.heap);

    if (DEBUG) {
      let { program, program: { heap } } = options;
      let start = heap.getaddr(handle);
      let end = start + heap.sizeof(handle);
      debugSlice(program, start, end);
    }

    return handle;
  }
}

function blockFor(layout: ParsedLayout, options: CompileOptions): CompilableTemplate<BlockSymbolTable> {
  let { block, meta } = layout;

  return new CompilableTemplate<BlockSymbolTable>(block.statements, layout, options, { meta, parameters: EMPTY_ARRAY });
}

export class ComponentBuilder implements IComponentBuilder {
  constructor(private builder: OpcodeBuilder) {}

  static(definition: Opaque, args: ComponentArgs) {
    let [params, hash, _default, inverse] = args;
    let { builder } = this;

    builder.pushComponentManager(definition as Specifier);
    builder.invokeComponent(null, params, hash, false, _default, inverse);
  }
}
