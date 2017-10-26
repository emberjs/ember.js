/**
@module ember
@submodule ember-glimmer
*/
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';
import { MountDefinition } from '../component-managers/mount';
import { hashToArgs } from './utils';

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
  @category ember-application-engines
  @public
*/
export function mountMacro(name, params, hash, builder) {
  if (EMBER_ENGINES_MOUNT_PARAMS) {
    assert(
      'You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params.length === 1,
    );
  } else {
    assert(
      'You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params.length === 1 && hash === null,
    );
  }

  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [null, hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, dynamicEngineFor, args);
  return true;
}

class DynamicEngineReference {
  public tag: any;
  public nameRef: any;
  public env: any;
  public meta: any;
  private _lastName: any;
  private _lastDef: any;
  constructor({ nameRef, env, meta }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this.meta = meta;
    this._lastName = undefined;
    this._lastDef = undefined;
  }

  value() {
    let { env, nameRef /*meta*/ } = this;
    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      if (this._lastName === nameOrDef) {
        return this._lastDef;
      }

      assert(
        `You used \`{{mount '${nameOrDef}'}}\`, but the engine '${nameOrDef}' can not be found.`,
        env.owner.hasRegistration(`engine:${nameOrDef}`),
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
        nameOrDef === null || nameOrDef === undefined,
      );

      return null;
    }
  }
}
