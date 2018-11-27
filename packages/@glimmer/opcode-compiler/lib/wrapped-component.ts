import { Register, $s1, $s0 } from '@glimmer/vm';
import {
  ProgramSymbolTable,
  CompilableProgram,
  CompilableBlock,
  LayoutWithContext,
  Compiler,
  Option,
  Recast,
} from '@glimmer/interfaces';

import { ComponentArgs, ComponentBuilder as IComponentBuilder } from './interfaces';

import { debugCompiler, AnyAbstractCompiler } from './compiler';
import { CompilableBlock as CompilableBlockInstance } from './compilable-template';
import OpcodeBuilder from './opcode-builder-interfaces';
import { ATTRS_BLOCK } from './syntax';

import { DEBUG } from '@glimmer/local-debug-flags';
import { EMPTY_ARRAY } from '@glimmer/util';

export class WrappedBuilder<Locator> implements CompilableProgram {
  public symbolTable: ProgramSymbolTable;
  private compiled: Option<number> = null;
  private attrsBlockNumber: number;

  constructor(
    private compiler: Compiler<OpcodeBuilder<Locator>>,
    private layout: LayoutWithContext<Locator>
  ) {
    let { block } = layout;

    let symbols = block.symbols.slice();

    // ensure ATTRS_BLOCK is always included (only once) in the list of symbols
    let attrsBlockIndex = symbols.indexOf(ATTRS_BLOCK);
    if (attrsBlockIndex === -1) {
      this.attrsBlockNumber = symbols.push(ATTRS_BLOCK);
    } else {
      this.attrsBlockNumber = attrsBlockIndex + 1;
    }

    this.symbolTable = {
      hasEval: block.hasEval,
      symbols,
    };
  }

  compile(): number {
    if (this.compiled !== null) return this.compiled;
    //========DYNAMIC
    //        PutValue(TagExpr)
    //        Test
    //        JumpUnless(BODY)
    //        PutComponentOperations
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

    b.labels(() => {
      b.fetch($s1);

      b.getComponentTagName($s0);
      b.primitiveReference();

      b.dup();
      b.load($s1);

      b.jumpUnless('BODY');

      b.fetch($s1);
      b.setComponentAttrs(true);
      b.putComponentOperations();
      b.openDynamicElement();
      b.didCreateElement($s0);
      b.yield(this.attrsBlockNumber, []);
      b.setComponentAttrs(false);
      b.flushElement();

      b.label('BODY');

      b.invokeStaticBlock(blockFor(layout, compiler));

      b.fetch($s1);
      b.jumpUnless('END');
      b.closeElement();

      b.label('END');
      b.load($s1);
    });

    let handle = b.commit();

    if (DEBUG) {
      debugCompiler(
        compiler as Recast<Compiler<OpcodeBuilder<Locator>>, AnyAbstractCompiler>,
        handle
      );
    }

    return (this.compiled = handle);
  }
}

function blockFor<Locator>(
  layout: LayoutWithContext,
  compiler: Compiler<OpcodeBuilder<Locator>>
): CompilableBlock {
  return new CompilableBlockInstance(compiler, {
    block: {
      statements: layout.block.statements,
      parameters: EMPTY_ARRAY,
    },
    containingLayout: layout,
  });
}

export class ComponentBuilderImpl<Locator> implements IComponentBuilder {
  constructor(private builder: OpcodeBuilder<Locator>) {}

  static(handle: number, args: ComponentArgs) {
    let [params, hash, blocks] = args;
    let { builder } = this;

    if (handle !== null) {
      let { capabilities, compilable } = builder.compiler.resolveLayoutForHandle(handle);

      if (compilable) {
        builder.pushComponentDefinition(handle);
        builder.invokeStaticComponent({
          capabilities,
          layout: compilable,
          attrs: null,
          params,
          hash,
          synthetic: false,
          blocks,
        });
      } else {
        builder.pushComponentDefinition(handle);
        builder.invokeComponent({
          capabilities,
          attrs: null,
          params,
          hash,
          synthetic: false,
          blocks,
        });
      }
    }
  }
}
