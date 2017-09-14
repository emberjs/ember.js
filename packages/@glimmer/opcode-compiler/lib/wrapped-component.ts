import { Register } from '@glimmer/vm';
import { ProgramSymbolTable, BlockSymbolTable, VMHandle, ComponentCapabilities } from '@glimmer/interfaces';

import {
  ComponentArgs,
  ComponentBuilder as IComponentBuilder,
  ParsedLayout
} from './interfaces';

import { CompileOptions } from './syntax';
import CompilableTemplate, { ICompilableTemplate } from './compilable-template';
import { debugSlice } from './debug';
import { OpcodeBuilder } from './opcode-builder';
import { ATTRS_BLOCK } from './syntax';

import { DEBUG } from "@glimmer/local-debug-flags";
import { EMPTY_ARRAY } from "@glimmer/util";

export class WrappedBuilder<Specifier> implements ICompilableTemplate<ProgramSymbolTable> {
  public symbolTable: ProgramSymbolTable;
  private referrer: Specifier;

  constructor(public options: CompileOptions<Specifier>, private layout: ParsedLayout<Specifier>, private capabilities: ComponentCapabilities) {
    let { block } = layout;
    let referrer = this.referrer = layout.referrer;

    this.symbolTable = {
      referrer,
      hasEval: block.hasEval,
      symbols: block.symbols.concat([ATTRS_BLOCK])
    };
  }

  compile(): VMHandle {
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

    let { options, layout, referrer } = this;
    let { program, lookup, macros, asPartial } = options;
    let { Builder } = options;

    let b = new Builder(program, lookup, referrer, macros, layout, asPartial);

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

function blockFor<Specifier>(layout: ParsedLayout, options: CompileOptions<Specifier>): CompilableTemplate<BlockSymbolTable, Specifier> {
  let { block, referrer } = layout;

  return new CompilableTemplate(block.statements, layout, options, { referrer, parameters: EMPTY_ARRAY });
}

export class ComponentBuilder<Specifier> implements IComponentBuilder {
  constructor(private builder: OpcodeBuilder<Specifier>) {}

  static(handle: number, args: ComponentArgs) {
    let [params, hash, _default, inverse] = args;
    let { builder } = this;
    let { lookup } = builder;

    if (handle !== null) {
      let capabilities = lookup.getCapabilities(handle);

      if (capabilities.dynamicLayout === false) {
        let layout = lookup.getLayout(handle)!;

        builder.pushComponentDefinition(handle);
        builder.invokeStaticComponent(capabilities, layout, null, params, hash, false, _default, inverse);
      } else {
        builder.pushComponentDefinition(handle);
        builder.invokeComponent(null, params, hash, false, _default, inverse);
      }
    }
  }
}
