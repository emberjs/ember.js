import * as ASTv1 from '../v1/api';

function getLocalName(node: ASTv1.Node): string | undefined {
  switch (node.type) {
    case 'ElementNode':
      // unfortunately the ElementNode stores `tag` as a string
      // if that changes in glimmer-vm this will need to be updated
      return node.tag.split('.')[0];

    case 'SubExpression':
    case 'MustacheStatement':
    case 'BlockStatement':
      return getLocalName(node.path);

    case 'UndefinedLiteral':
    case 'NullLiteral':
    case 'BooleanLiteral':
    case 'StringLiteral':
    case 'NumberLiteral':
    case 'TextNode':
    case 'Template':
    case 'Block':
    case 'CommentStatement':
    case 'MustacheCommentStatement':
    case 'PartialStatement':
    case 'ElementModifierStatement':
    case 'AttrNode':
    case 'ConcatStatement':
    case 'Program':
    case 'Hash':
    case 'HashPair':
      return undefined;
    case 'PathExpression':
    default:
      return node.parts.length ? node.parts[0] : undefined;
  }
}

function getLocals(node: ASTv1.Node): string[] | undefined {
  switch (node.type) {
    case 'ElementNode':
    case 'Program':
    case 'Block':
    case 'Template':
      return node.blockParams;

    case 'BlockStatement':
      return node.program.blockParams;

    default:
      return undefined;
  }
}

export abstract class TransformScope {
  hasPartial = false;
  usedLocals: { [key: string]: boolean } = {};

  constructor(protected locals: string[]) {
    for (const local of locals) {
      this.usedLocals[local] = false;
    }
  }

  child(node: ASTv1.Node): TransformScope {
    let locals = getLocals(node);

    return locals ? new ChildTransformScope(locals, this) : this;
  }

  usePartial(): void {
    this.hasPartial = true;
  }

  abstract isLocal(name: string): boolean;
  abstract useLocal(node: ASTv1.Node): void;
  abstract currentUnusedLocals(): string[] | false;
}

export default class RootTransformScope extends TransformScope {
  constructor(node: ASTv1.Node) {
    let locals = getLocals(node) ?? [];

    super(locals);
  }

  useLocal(node: ASTv1.Node): void {
    let name = getLocalName(node);

    if (name && name in this.usedLocals) {
      this.usedLocals[name] = true;
    }
  }

  isLocal(name: string): boolean {
    return this.locals.indexOf(name) !== -1;
  }

  currentUnusedLocals(): string[] | false {
    if (!this.hasPartial && this.locals.length > 0) {
      return this.locals.filter((local) => !this.usedLocals[local]);
    }

    return false;
  }
}

class ChildTransformScope extends TransformScope {
  constructor(locals: string[], private parent: TransformScope) {
    super(locals);
  }

  useLocal(node: ASTv1.Node): void {
    let name = getLocalName(node);

    if (name && name in this.usedLocals) {
      this.usedLocals[name] = true;
    } else {
      this.parent.useLocal(node);
    }
  }

  isLocal(name: string): boolean {
    return this.locals.indexOf(name) !== -1 || this.parent.isLocal(name);
  }

  currentUnusedLocals(): string[] | false {
    if (!this.hasPartial && this.locals.length > 0) {
      // We only care about the last local, because if it is used then it implies
      // usage of the others (specifically when in a child block, |foo bar|)
      if (!this.usedLocals[this.locals[this.locals.length - 1]]) {
        return [this.locals[this.locals.length - 1]];
      }
    }

    return false;
  }
}
