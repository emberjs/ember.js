import { StatementSyntax, ExpressionSyntax } from '../opcodes';
import { Params, EvaluatedParams } from '../template';
import { VM } from '../vm';
import { Frame } from '../environment';
import { InternedString } from 'htmlbars-util';
import { ChainableReference, RootReference, PathReference } from 'htmlbars-reference';

export interface PushScopeOptions {
  localNames: InternedString[];
  blockArguments: ExpressionSyntax;
  hostOptions?: any;
}

export class PushChildScope extends StatementSyntax {
  public localNames: InternedString[];
  public blockArguments: ExpressionSyntax;
  public hostOptions: any;

  constructor({ localNames, blockArguments, hostOptions }: PushScopeOptions) {
    super();
    this.localNames = localNames;
    this.blockArguments = blockArguments;
    this.hostOptions = hostOptions || null;
  }

  clone(): PushChildScope {
    return new PushChildScope(this);
  }

  evaluate(stack, frame: Frame, vm: VM<any>) {
    let { localNames, blockArguments, hostOptions } = this;

    // Question: should we dup the frame here?
    let args = <EvaluatedParams>this.blockArguments.evaluate(frame);
    // let blockArgumentReferences = <RootReference[]>this.blockArguments.evaluate(frame).toArray();

    vm.pushScope(
      frame.childScope().init({
        localNames,
        blockArgumentReferences: <PathReference[]>args.toArray(),
        hostOptions
      })
    );

    return null;
  }
}

export class PushRootScope extends StatementSyntax {
  public localNames: InternedString[];
  public blockArguments: Params;
  public hostOptions: any;

  constructor({ localNames, blockArguments, hostOptions }: PushScopeOptions) {
    super();
    this.localNames = localNames;
    this.blockArguments = blockArguments;
    this.hostOptions = hostOptions || null;
  }

  clone(): PushRootScope {
    return new PushRootScope(this);
  }

  evaluate(stack, frame: Frame, vm: VM<any>) {
    let { localNames, blockArguments, hostOptions } = this;

    // Question: should we dup the frame here?
    let blockArgumentReferences = <RootReference[]>this.blockArguments.evaluate(frame).toArray();

    vm.pushScope(
      frame.resetScope().init({
        localNames,
        blockArgumentReferences,
        hostOptions
      })
    );

    return null;
  }
}

export class Evaluate extends StatementSyntax {
  public syntax: ExpressionSyntax;
  public name: InternedString;

  constructor({ syntax, name }: { syntax: ExpressionSyntax, name: InternedString }) {
    super();
    this.syntax = syntax;
    this.name = name;
  }

  clone(): Evaluate {
    return new Evaluate(this)
  }

  evaluate(stack, frame: Frame, vm: VM<any>) {
    vm.scope().bindLocalReference(this.name, <RootReference>this.syntax.evaluate(frame));
    return null;
  }
}

export class Deref implements ExpressionSyntax {
  public type = "inline-deref";
  public parent: InternedString;
  public name: InternedString;

  constructor({ parent, name }: { parent: InternedString, name: InternedString }) {
    this.parent = parent;
    this.name = name;
  }

  prettyPrint() {
    return `inline-deref ${this.parent}.${this.name}`
  }

  evaluate(frame: Frame): PathReference {
    return frame.scope().getLocal(this.parent).get(this.name);
  }
}

export class GetLocal implements ExpressionSyntax {
  public type = "inline-get-local";
  public name: InternedString;

  constructor({ name }: { name: InternedString }) {
    this.name = name;
  }

  prettyPrint() {
    return `inline-get-local ${this.name}`
  }

  evaluate(frame: Frame): PathReference {
    return frame.scope().getLocal(this.name);
  }
}

export class PopScope extends StatementSyntax {
  clone(): PopScope {
    return new PopScope();
  }

  evaluate(stack, frame, vm: VM<any>) {
    vm.popScope();
    return null;
  }
}