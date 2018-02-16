import { Register } from '@glimmer/vm';
import { ProgramSymbolTable, CompilableProgram, CompilableBlock, LayoutWithContext, Compiler, Recast } from '@glimmer/interfaces';

import {
  ComponentArgs,
  ComponentBuilder as IComponentBuilder
} from './interfaces';

import { debug, AnyAbstractCompiler } from './compiler';
import { CompilableBlock as CompilableBlockInstance } from './compilable-template';
import { OpcodeBuilder } from './opcode-builder';
import { ATTRS_BLOCK } from './syntax';

import { DEBUG } from "@glimmer/local-debug-flags";
import { EMPTY_ARRAY } from "@glimmer/util";

export class WrappedBuilder<TemplateMeta> implements CompilableProgram {
  public symbolTable: ProgramSymbolTable;

  constructor(private compiler: Compiler<OpcodeBuilder<TemplateMeta>>, private layout: LayoutWithContext<TemplateMeta>) {
    let { block } = layout;

    this.symbolTable = {
      hasEval: block.hasEval,
      symbols: block.symbols.concat([ATTRS_BLOCK])
    };
  }

  compile(): number {
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

    let { compiler, layout } = this;
    let b = compiler.builderFor(layout);

    b.startLabels();

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

    b.invokeStaticBlock(blockFor(layout, compiler));

    b.fetch(Register.s1);
    b.jumpUnless('END');
    b.closeElement();

    b.label('END');
    b.load(Register.s1);

    b.stopLabels();

    let handle = b.commit();

    if (DEBUG) {
      debug(compiler as Recast<Compiler<OpcodeBuilder<TemplateMeta>>, AnyAbstractCompiler>, handle);
    }

    return handle;
  }
}

function blockFor<TemplateMeta>(layout: LayoutWithContext, compiler: Compiler<OpcodeBuilder<TemplateMeta>>): CompilableBlock {
  return new CompilableBlockInstance(compiler, {
    block: {
      statements: layout.block.statements,
      parameters: EMPTY_ARRAY
    },
    containingLayout: layout
  });
}

export class ComponentBuilder<TemplateMeta> implements IComponentBuilder {
  constructor(private builder: OpcodeBuilder<TemplateMeta>) {}

  static(handle: number, args: ComponentArgs) {
    let [params, hash, _default, inverse] = args;
    let { builder } = this;

    if (handle !== null) {
      let { capabilities, compilable } = builder.compiler.resolveLayoutForHandle(handle);

      if (compilable) {
        builder.pushComponentDefinition(handle);
        builder.invokeStaticComponent(capabilities, compilable, null, params, hash, false, _default, inverse);
      } else {
        builder.pushComponentDefinition(handle);
        builder.invokeComponent(null, params, hash, false, _default, inverse);
      }
    }
  }
}
