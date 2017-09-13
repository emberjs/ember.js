import { Opaque } from '@glimmer/util';
import { Program } from '@glimmer/program';
import { RuntimeResolver } from '@glimmer/interfaces';
import { DOMTreeConstruction, DOMChanges } from '@glimmer/runtime';

import TestEnvironment, { TestEnvironmentOptions } from '../../environment';

export default class EagerTestEnvironment extends TestEnvironment<Opaque> {
  protected program: Program<Opaque>;
  protected resolver: RuntimeResolver<Opaque>;

  constructor(options?: TestEnvironmentOptions) {
    if (!options) {
      let document = window.document;
      let appendOperations = new DOMTreeConstruction(document);
      let updateOperations = new DOMChanges(document as HTMLDocument);
      options = { appendOperations, updateOperations };
    }

    super(options);
  }
}
