import { StatementSyntax, ExpressionSyntax } from '../opcodes';
import Template, { Params, EvaluatedParams } from '../template';
import { VM } from '../vm';
import { Scope, Frame } from '../environment';
import { ElementStack } from '../builder';
import { TemplateMorph } from '../morph';
import { RenderResult } from '../render';
import { InternedString } from 'htmlbars-util';
import { ChainableReference, RootReference, ConstReference, PathReference } from 'htmlbars-reference';

export interface PushScopeOptions {
  localNames: InternedString[];
  blockArguments?: ExpressionSyntax[];
  spreadBlockArguments?: ExpressionSyntax;
  hostOptions?: any;
}


abstract class PushScope extends StatementSyntax {
  public localNames: InternedString[];
  public spreadBlockArguments: ExpressionSyntax;
  public blockArguments: ExpressionSyntax[];
  public hostOptions: any;

  constructor({ localNames, blockArguments, spreadBlockArguments, hostOptions }: PushScopeOptions) {
    super();
    this.localNames = localNames;
    this.blockArguments = blockArguments;
    this.spreadBlockArguments = spreadBlockArguments;
    this.hostOptions = hostOptions || null;
  }

  clone(): PushScope {
    return new (<any>this.constructor)(this);
  }

  evaluate(stack, frame: Frame, vm: VM<any>) {
    let { localNames, blockArguments, spreadBlockArguments, hostOptions } = this;

    let args: PathReference[];

    // Question: should we dup the frame here?
    if (spreadBlockArguments) {
      args = <any>(<EvaluatedParams>this.spreadBlockArguments.evaluate(frame)).toArray();
    } else if (blockArguments) {
      args = <any>blockArguments.map(arg => arg.evaluate(frame));
    }

    vm.pushScope(this.createScope(frame).init({
      localNames,
      blockArgumentReferences: args,
      hostOptions
    }));

    return null;
  }

  protected abstract createScope(frame: Frame): Scope<any>;
}

export class PushChildScope extends PushScope {
  protected createScope(frame: Frame): Scope<any> {
    return frame.childScope();
  }
}

export class PushRootScope extends PushScope {
  protected createScope(frame: Frame): Scope<any> {
    return frame.resetScope();
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

export class NoopSyntax extends StatementSyntax {
  clone(): NoopSyntax {
    return new NoopSyntax();
  }

  evaluate() {
    return null;
  }
}

export class OpenBlock extends StatementSyntax {
  clone(): OpenBlock {
    return new OpenBlock();
  }

  evaluate(stack: ElementStack) {
    stack.openBlock();
    return null;
  }
}

export interface CloseBlockOptions {
  syntax: StatementSyntax;
  template: Template;
}

export class CloseBlock extends StatementSyntax {
  public syntax: StatementSyntax;
  public template: Template;

  constructor({ syntax, template }: CloseBlockOptions) {
    super();
    this.syntax = syntax;
    this.template = template;
  }

  clone(): CloseBlock {
    return new CloseBlock(this);
  }

  evaluate(stack: ElementStack, frame: Frame, vm: VM<any>) {
    let result: RenderResult = stack.closeBlock(this.template);
    let morph = <TemplateMorph>this.syntax.evaluate(stack, frame, vm);
    morph.willAppend(stack);

    if (this.template) {
      morph.setRenderResult(result);
    } else {
      morph.didBecomeEmpty();
    }

    return null;
  }
}

export interface PutObjectOptions {
  register: InternedString;
  syntax: ExpressionSyntax;
}

export class PutObject extends StatementSyntax {
  public register: InternedString;
  public syntax: ExpressionSyntax;

  constructor({ register, syntax }: PutObjectOptions) {
    super();
    this.register = register;
    this.syntax = syntax;
  }

  clone(): PutObject {
    return new PutObject(this);
  }

  evaluate(stack, frame: Frame, vm: VM<any>) {
    vm.scope()[<string>this.register] = this.syntax.evaluate(frame);
    return null;
  }
}

export interface GetObjectOptions {
  register: InternedString;
}

export class GetObject implements ExpressionSyntax {
  public type = "inline-get-object";
  public register: InternedString;

  constructor({ register }: GetObjectOptions) {
    this.register = register;
  }

  prettyPrint() {
    return `inline-get-object ${this.register}`;
  }

  clone(): GetObject {
    return new GetObject(this);
  }

  evaluate(frame: Frame) {
    return frame.scope()[<string>this.register];
  }
}

export interface DerefRegisterOptions {
  register: InternedString;
  path: InternedString;
}

export class DerefRegister implements ExpressionSyntax {
  public type = "inline-deref-register";
  public register: InternedString;
  public path: InternedString;

  constructor({ register, path }: DerefRegisterOptions) {
    this.register = register;
    this.path = path;
  }

  prettyPrint() {
    return `inline-deref-register $${this.register}.${this.path}`;
  }

  clone(): DerefRegister {
    return new DerefRegister(this);
  }

  evaluate(frame: Frame) {
    return frame.scope()[<string>this.register].get(<string>this.path);
  }
}

export class StartIter extends StatementSyntax {
  clone(): StartIter {
    return new StartIter();
  }

  evaluate(stack, frame: Frame, vm: VM<any>) {
    let scope = vm.scope();
    let iterator = frame.iteratorFor(scope.iterable);

    scope.iterator = iterator;
    scope.iterationCounter = 0;

    let { done, value } = iterator.next();

    scope.condition = done ? FALSE : TRUE;
    scope.iterationItem = value;
    return null;
  }
}

export class NextIter extends StatementSyntax {
  clone(): NextIter {
    return new NextIter();
  }

  evaluate(stack, frame: Frame, vm: VM<any>) {
    let scope = vm.scope();
    let iterator = scope.iterator;

    scope.iterationCounter++;

    let { done, value } = iterator.next();

    scope.condition = done ? FALSE : TRUE;
    scope.iterationItem = value;
    return null;
  }
}

const TRUE = new ConstReference(true);
const FALSE = new ConstReference(false);