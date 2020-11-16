import { SourceSpan } from '../../source/span';

export interface BaseNodeFields {
  loc: SourceSpan;
}

/**
 * This is a convenience function for creating ASTv2 nodes, with an optional name and the node's
 * options.
 *
 * ```ts
 * export class HtmlText extends node('HtmlText').fields<{ chars: string }>() {}
 * ```
 *
 * This creates a new ASTv2 node with the name `'HtmlText'` and one field `chars: string` (in
 * addition to a `loc: SourceOffsets` field, which all nodes have).
 *
 * ```ts
 * export class Args extends node().fields<{
 *  positional: PositionalArguments;
 *  named: NamedArguments
 * }>() {}
 * ```
 *
 * This creates a new un-named ASTv2 node with two fields (`positional: Positional` and `named:
 * Named`, in addition to the generic `loc: SourceOffsets` field).
 *
 * Once you create a node using `node`, it is instantiated with all of its fields (including `loc`):
 *
 * ```ts
 * new HtmlText({ loc: offsets, chars: someString });
 * ```
 */
export function node(): {
  fields<Fields extends object>(): NodeConstructor<Fields & BaseNodeFields>;
};
export function node<T extends string>(
  name: T
): {
  fields<Fields extends object>(): TypedNodeConstructor<T, Fields & BaseNodeFields>;
};

export function node<T extends string>(
  name?: T
):
  | {
      fields<Fields extends object>(): TypedNodeConstructor<T, Fields & BaseNodeFields>;
    }
  | {
      fields<Fields extends object>(): NodeConstructor<Fields & BaseNodeFields>;
    } {
  if (name !== undefined) {
    const type = name;
    return {
      fields<Fields extends object>(): TypedNodeConstructor<T, BaseNodeFields & Fields> {
        return class {
          readonly loc: SourceSpan;
          readonly type: T;

          constructor(fields: BaseNodeFields & Fields) {
            this.type = type;
            this.loc = fields.loc;
            copy(fields, (this as unknown) as ConstructingTypedNode<Fields>);
          }
        } as TypedNodeConstructor<T, BaseNodeFields & Fields>;
      },
    };
  } else {
    return {
      fields<Fields>(): NodeConstructor<Fields & BaseNodeFields> {
        return class {
          readonly loc: SourceSpan;

          constructor(fields: BaseNodeFields & Fields) {
            this.loc = fields.loc;

            copy(fields, (this as unknown) as ConstructingNode<Fields>);
          }
        } as NodeConstructor<BaseNodeFields & Fields>;
      },
    };
  }
}

type ConstructingTypedNode<Fields> = Fields & BaseNodeFields;

type ConstructingNode<Fields> = BaseNodeFields & Fields;

export interface NodeConstructor<Fields> {
  new (fields: Fields): Readonly<Fields>;
}

type TypedNode<T extends string, Fields> = { type: T } & Readonly<Fields>;

export interface TypedNodeConstructor<T extends string, Fields> {
  new (options: Fields): TypedNode<T, Fields>;
}

function keys<O extends object>(object: O): (keyof O)[] {
  return Object.keys(object) as (keyof O)[];
}

function copy<O extends object>(object1: O, object2: O) {
  for (let key of keys(object1)) {
    object2[key] = object1[key];
  }
}
