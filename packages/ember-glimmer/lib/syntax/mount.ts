/**
@module ember
*/
import {
  Arguments,
  VM,
  OpcodeBuilderDSL,
  ComponentArgs
} from '@glimmer/runtime';
import * as WireFormat from '@glimmer/wire-format';
import { assert } from 'ember-debug';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';
import Environment from '../environment';
import { MountDefinition } from '../component-managers/mount';
import { hashToArgs } from './utils';
import { Option } from '@glimmer/util';
import { Tag, PathReference } from '@glimmer/reference';

function dynamicEngineFor(vm: VM, args: Arguments) {
  let env     = vm.env as Environment;
  let nameRef = args.positional.at(0) as PathReference<string>;

  return new DynamicEngineReference({ nameRef, env });
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
export function mountMacro(_name: string, params: WireFormat.Core.Params, hash: WireFormat.Core.Hash, builder: OpcodeBuilderDSL) {
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

  let definitionArgs: ComponentArgs = [params.slice(0, 1), null, null, null];
  let args: ComponentArgs = [[], hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, dynamicEngineFor, args);
  return true;
}

class DynamicEngineReference {
  public tag: Tag;
  public nameRef: PathReference<string>;
  public env: Environment;
  private _lastName: Option<string>;
  private _lastDef: Option<MountDefinition>;
  constructor({ nameRef, env }: { nameRef: PathReference<string>, env: Environment }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this._lastName = null;
    this._lastDef = null;
  }

  get(): never {
    throw new Error('unexpected get on DynamicEngineReference');
  }

  value() {
    let { env, nameRef } = this;
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
