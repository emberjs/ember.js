/**
@module ember
@submodule ember-glimmer
*/
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';
import { hashToArgs } from './utils';
import { MountDefinition } from '../component-managers/mount';

function dynamicEngineFor(vm, args, meta) {
  let env     = vm.env;
  let nameRef = args.positional.at(0);

  return new DynamicEngineReference({ nameRef, env, meta });
}

/**
  The `{{mount}}` helper lets you embed a routeless engine in a template.
  Mounting an engine will cause an instance to be booted and its `application`
  template to be rendered.

  For example, the following template mounts the `ember-chat` engine:

  ```handlebars
  {{! application.hbs }}
  {{mount "ember-chat"}}
  ```

  Currently, the engine name is the only argument that can be passed to
  `{{mount}}`.

  @method mount
  @for Ember.Templates.helpers
  @category ember-application-engines
  @public
*/
export function mountMacro(name, params, hash, builder) {
  if (EMBER_ENGINES_MOUNT_PARAMS) {
    assert(
      'You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params.length === 1
    );
  } else {
    assert(
      'You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params.length === 1 && hash === null
    );
  }

  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [null, hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, dynamicEngineFor, args);
  return true;
}

class DynamicEngineReference {
  constructor({ nameRef, env, meta }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this.meta = meta;
    this._lastName = undefined;
    this._lastDef = undefined;
  }

  value() {
    let { env, nameRef, /*meta*/ } = this;
    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      if (this._lastName === nameOrDef) {
        return this._lastDef;
      }

      assert(
        `You used \`{{mount '${nameOrDef}'}}\`, but the engine '${nameOrDef}' can not be found.`,
        env.owner.hasRegistration(`engine:${nameOrDef}`)
      );

      if (!env.owner.hasRegistration(`engine:${nameOrDef}`)) {
        return null;
      }

      this._lastName = nameOrDef;
      this._lastDef = new MountDefinition(nameOrDef);

      return this._lastDef;
    } else {
      assert(
        `Invalid engine name '${nameOrDef}' specified, engine name must be either a string, null or undefined.`,
        nameOrDef === null || nameOrDef === undefined
      );

      return null;
    }
  }
}
