import { StatementSyntax } from '../opcodes';
import { Params } from '../template';
import { VM } from '../vm';
import { Frame } from '../environment';
import { InternedString } from 'htmlbars-util';
import { ChainableReference, RootReference } from 'htmlbars-reference';

export interface PushScopeOptions {
  localNames: InternedString[];
  blockArguments: Params;
  hostOptions?: any;
}

export class PushChildScope extends StatementSyntax {
  public localNames: InternedString[];
  public blockArguments: Params;
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
    let blockArgumentReferences = <RootReference[]>this.blockArguments.evaluate(frame).toArray();

    vm.pushScope(
      frame.childScope().init({
        localNames,
        blockArgumentReferences,
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

export class PopScope extends StatementSyntax {
  clone(): PopScope {
    return new PopScope();
  }

  evaluate(stack, frame, vm: VM<any>) {
    vm.popScope();
    return null;
  }
}