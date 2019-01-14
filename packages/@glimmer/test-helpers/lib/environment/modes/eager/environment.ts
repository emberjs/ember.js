import { EnvironmentOptions } from '@glimmer/interfaces';
import { DOMChanges, DOMTreeConstruction } from '@glimmer/runtime';
import { SimpleDocument } from '@simple-dom/interface';
import TestEnvironment, { TestProgram } from '../../environment';

export default class EagerTestEnvironment extends TestEnvironment {
  protected program!: TestProgram;
  // protected resolver!: RuntimeResolverOptions;

  constructor(options?: EnvironmentOptions) {
    if (!options) {
      let document = window.document as SimpleDocument;
      let appendOperations = new DOMTreeConstruction(document);
      let updateOperations = new DOMChanges(document);
      options = { appendOperations, updateOperations };
    }

    super(options);
  }
}
