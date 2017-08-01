import { Register } from '@glimmer/vm';
import { ProgramSymbolTable, Opaque } from '@glimmer/interfaces';
import { TemplateMeta } from '@glimmer/wire-format';
import { Template } from './template';
import { debugSlice } from './opcodes';
import { ATTRS_BLOCK } from './syntax/functions';
import { Handle, CompilationOptions } from './environment';
import { ComponentCapabilities } from './component/interfaces';
import { ICompilableTemplate } from './syntax/compilable-template';
import { CompilationOptions as InternalCompilationOptions, Specifier } from './internal-interfaces';

import {
  ComponentArgs,
  ComponentBuilder as IComponentBuilder
} from './opcode-builder';

import OpcodeBuilderDSL, { LazyOpcodeBuilder } from './compiled/opcodes/builder';

import { DEBUG } from "@glimmer/local-debug-flags";

export function prepareLayout<O extends CompilationOptions<any, any, any>>(options: O, layout: Template<TemplateMeta>, capabilities: ComponentCapabilities): ICompilableTemplate<ProgramSymbolTable> {
  return new WrappedBuilder(options, layout, capabilities);
}

class WrappedBuilder implements ICompilableTemplate<ProgramSymbolTable> {
  public symbolTable: ProgramSymbolTable;
  private meta: { templateMeta: TemplateMeta, symbols: string[], asPartial: false };

  constructor(public options: InternalCompilationOptions, private layout: Template<TemplateMeta>, private capabilities: ComponentCapabilities) {
    let meta = this.meta = { templateMeta: layout.meta, symbols: layout.symbols, asPartial: false };

    this.symbolTable = {
      meta,
      hasEval: layout.hasEval,
      symbols: layout.symbols.concat([ATTRS_BLOCK])
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

    let { options, layout } = this;
    let meta = { templateMeta: layout.meta, symbols: layout.symbols, asPartial: false };

    let b = new LazyOpcodeBuilder(options, meta);

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

    b.invokeStaticBlock(layout.asBlock());

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

export class ComponentBuilder implements IComponentBuilder {
  private options: InternalCompilationOptions;

  constructor(private builder: OpcodeBuilderDSL) {
    this.options = builder.options;
  }

  static(definition: Opaque, args: ComponentArgs) {
    let [params, hash, _default, inverse] = args;
    let { builder } = this;

    builder.pushComponentManager(definition as Specifier);
    builder.invokeComponent(null, params, hash, false, _default, inverse);
  }
}
