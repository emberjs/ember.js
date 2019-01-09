import { MachineOp, Op, StatementCompileActions } from '@glimmer/interfaces';
import { invokeStaticBlock, invokeStaticBlockWithStack } from '@glimmer/opcode-compiler';
import { assert, unwrap } from '@glimmer/util';
import { $fp, $sp } from '@glimmer/vm';
import { op } from '../opcode-builder/encoder';
import {
  invokeDynamicComponent,
  staticComponentHelper,
} from '../opcode-builder/helpers/components';
import { replayable, replayableIf } from '../opcode-builder/helpers/conditional';
import { compileParams } from '../opcode-builder/helpers/shared';
import { dynamicScope, pushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { label } from '../opcode-builder/operands';
import { EMPTY_BLOCKS } from '../utils';
import { isHandled, NONE, UNHANDLED } from './concat';
import { Blocks, Inlines } from './macros';

export function populateBuiltins(
  blocks: Blocks = new Blocks(),
  inlines: Inlines = new Inlines()
): { blocks: Blocks; inlines: Inlines } {
  blocks.add('if', (params, _hash, blocks) => {
    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #if requires a single argument`);
    }

    return replayableIf({
      args() {
        return {
          count: 1,
          actions: [op('Expr', params[0]), op(Op.ToBoolean)],
        };
      },

      ifTrue() {
        return invokeStaticBlock(unwrap(blocks.get('default')));
      },

      ifFalse() {
        if (blocks.has('else')) {
          return invokeStaticBlock(blocks.get('else')!);
        } else {
          return NONE;
        }
      },
    });
  });

  blocks.add('unless', (params, _hash, blocks) => {
    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #unless requires a single argument`);
    }

    return replayableIf({
      args() {
        return {
          count: 1,
          actions: [op('Expr', params[0]), op(Op.ToBoolean)],
        };
      },

      ifTrue() {
        if (blocks.has('else')) {
          return invokeStaticBlock(blocks.get('else')!);
        } else {
          return NONE;
        }
      },

      ifFalse() {
        return invokeStaticBlock(unwrap(blocks.get('default')));
      },
    });
  });

  blocks.add('with', (params, _hash, blocks) => {
    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #with requires a single argument`);
    }

    return replayableIf({
      args() {
        return {
          count: 2,
          actions: [op('Expr', params[0]), op(Op.Dup, $sp, 0), op(Op.ToBoolean)],
        };
      },

      ifTrue() {
        return invokeStaticBlockWithStack(unwrap(blocks.get('default')), 1);
      },

      ifFalse() {
        if (blocks.has('else')) {
          return invokeStaticBlock(blocks.get('else')!);
        } else {
          return NONE;
        }
      },
    });
  });

  blocks.add('each', (params, hash, blocks) => {
    return replayable({
      args() {
        let actions: StatementCompileActions;

        if (hash && hash[0][0] === 'key') {
          actions = [op('Expr', hash[1][0])];
        } else {
          actions = [pushPrimitiveReference(null)];
        }

        actions.push(op('Expr', params[0]));

        return { count: 2, actions };
      },

      body() {
        let out: StatementCompileActions = [
          op(Op.PutIterator),
          op(Op.JumpUnless, label('ELSE')),
          op(MachineOp.PushFrame),
          op(Op.Dup, $fp, 1),
          op(MachineOp.ReturnTo, label('ITER')),
          op(Op.EnterList, label('BODY')),
          op('Label', 'ITER'),
          op(Op.Iterate, label('BREAK')),
          op('Label', 'BODY'),
          invokeStaticBlockWithStack(unwrap(blocks.get('default')), 2),
          op(Op.Pop, 2),
          op(MachineOp.Jump, label('FINALLY')),
          op('Label', 'BREAK'),
          op(Op.ExitList),
          op(MachineOp.PopFrame),
          op(MachineOp.Jump, label('FINALLY')),
          op('Label', 'ELSE'),
        ];

        if (blocks.has('else')) {
          out.push(invokeStaticBlock(blocks.get('else')!));
        }

        return out;
      },
    });
  });

  blocks.add('in-element', (params, hash, blocks) => {
    if (!params || params.length !== 1) {
      throw new Error(`SYNTAX ERROR: #in-element requires a single argument`);
    }

    return replayableIf({
      args() {
        let [keys, values] = hash!;

        let actions: StatementCompileActions = [];

        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          if (key === 'nextSibling' || key === 'guid') {
            actions.push(op('Expr', values[i]));
          } else {
            throw new Error(`SYNTAX ERROR: #in-element does not take a \`${keys[0]}\` option`);
          }
        }

        actions.push(op('Expr', params[0]), op(Op.Dup, $sp, 0));

        return { count: 4, actions };
      },

      ifTrue() {
        return [
          op(Op.PushRemoteElement),
          invokeStaticBlock(unwrap(blocks.get('default'))),
          op(Op.PopRemoteElement),
        ];
      },
    });
  });

  blocks.add('-with-dynamic-vars', (_params, hash, blocks) => {
    if (hash) {
      let [names, expressions] = hash;

      let { actions } = compileParams(expressions);

      return [
        actions,
        dynamicScope(names, () => {
          return invokeStaticBlock(unwrap(blocks.get('default')));
        }),
      ];
    } else {
      return invokeStaticBlock(unwrap(blocks.get('default')));
    }
  });

  blocks.add('component', (_params, hash, blocks, context) => {
    assert(_params && _params.length, 'SYNTAX ERROR: #component requires at least one argument');

    let tag = _params[0];
    if (typeof tag === 'string') {
      let returned = staticComponentHelper(
        context,
        _params[0] as string,
        hash,
        blocks.get('default')
      );

      if (isHandled(returned)) return returned;
    }

    let [definition, ...params] = _params!;

    return op('DynamicComponent', {
      definition,
      attrs: null,
      params,
      args: hash,
      atNames: false,
      blocks,
    });
  });

  inlines.add('component', (_name, _params, hash, context) => {
    assert(
      _params && _params.length,
      'SYNTAX ERROR: component helper requires at least one argument'
    );

    let tag = _params && _params[0];
    if (typeof tag === 'string') {
      let returned = staticComponentHelper(context, tag as string, hash, null);
      if (returned !== UNHANDLED) return returned;
    }

    let [definition, ...params] = _params!;
    return invokeDynamicComponent(context.meta, {
      definition,
      attrs: null,
      params,
      hash,
      atNames: false,
      blocks: EMPTY_BLOCKS,
    });
  });

  return { blocks, inlines };
}
