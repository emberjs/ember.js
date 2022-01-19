/**
@module ember
*/
import { Owner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments, CurriedType, Option } from '@glimmer/interfaces';
import { createComputeRef, Reference, valueForRef } from '@glimmer/reference';
import { createCapturedArgs, CurriedValue, curry, EMPTY_POSITIONAL } from '@glimmer/runtime';
import { MountDefinition } from '../component-managers/mount';
import { internalHelper } from '../helpers/internal-helper';

/**
  The `{{mount}}` helper lets you embed a routeless engine in a template.
  Mounting an engine will cause an instance to be booted and its `application`
  template to be rendered.

  For example, the following template mounts the `ember-chat` engine:

  ```handlebars
  {{! application.hbs }}
  {{mount "ember-chat"}}
  ```

  Additionally, you can also pass in a `model` argument that will be
  set as the engines model. This can be an existing object:

  ```
  <div>
    {{mount 'admin' model=userSettings}}
  </div>
  ```

  Or an inline `hash`, and you can even pass components:

  ```
  <div>
    <h1>Application template!</h1>
    {{mount 'admin' model=(hash
        title='Secret Admin'
        signInButton=(component 'sign-in-button')
    )}}
  </div>
  ```

  @method mount
  @param {String} name Name of the engine to mount.
  @param {Object} [model] Object that will be set as
                          the model of the engine.
  @for Ember.Templates.helpers
  @public
*/
export const mountHelper = internalHelper(
  (args: CapturedArguments, owner?: Owner): Reference<CurriedValue | null> => {
    assert('{{mount}} must be used within a component that has an owner', owner);
    let nameRef = args.positional[0] as Reference<Option<string>>;
    let captured: CapturedArguments | null;

    assert(
      'You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      args.positional.length === 1
    );

    if (DEBUG && args.named) {
      let keys = Object.keys(args.named);
      let extra = keys.filter((k) => k !== 'model');

      assert(
        'You can only pass a `model` argument to the {{mount}} helper, ' +
          'e.g. {{mount "profile-engine" model=this.profile}}. ' +
          `You passed ${extra.join(',')}.`,
        extra.length === 0
      );
    }

    captured = createCapturedArgs(args.named, EMPTY_POSITIONAL);

    let lastName: string | null, lastDef: CurriedValue | null;

    return createComputeRef(() => {
      let name = valueForRef(nameRef);

      if (typeof name === 'string') {
        if (lastName === name) {
          return lastDef;
        }

        assert(
          `You used \`{{mount '${name}'}}\`, but the engine '${name}' can not be found.`,
          owner.hasRegistration(`engine:${name}`)
        );

        lastName = name;
        lastDef = curry(CurriedType.Component, new MountDefinition(name), owner, captured, true);

        return lastDef;
      } else {
        assert(
          `Invalid engine name '${name}' specified, engine name must be either a string, null or undefined.`,
          name === null || name === undefined
        );
        lastDef = null;
        lastName = null;
        return null;
      }
    });
  }
);
