/**
@module ember
*/
import { EMBER_ENGINES_MOUNT_PARAMS } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { Opaque, Option } from '@glimmer/interfaces';
import { OpcodeBuilder } from '@glimmer/opcode-compiler';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import {
  Arguments,
  CurriedComponentDefinition,
  curry,
  UNDEFINED_REFERENCE,
  VM,
} from '@glimmer/runtime';
import * as WireFormat from '@glimmer/wire-format';
import { OwnedTemplateMeta } from 'ember-views';
import { MountDefinition } from '../component-managers/mount';
import Environment from '../environment';

export function mountHelper(
  vm: VM,
  args: Arguments
): VersionedPathReference<CurriedComponentDefinition | null> {
  let env = vm.env as Environment;
  let nameRef = args.positional.at(0);
  let modelRef = args.named.has('model') ? args.named.get('model') : undefined;
  return new DynamicEngineReference(nameRef, env, modelRef);
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
export function mountMacro(
  _name: string,
  params: Option<WireFormat.Core.Params>,
  hash: Option<WireFormat.Core.Hash>,
  builder: OpcodeBuilder<OwnedTemplateMeta>
) {
  if (EMBER_ENGINES_MOUNT_PARAMS) {
    assert(
      'You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params!.length === 1
    );
  } else {
    assert(
      'You can only pass a single argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
      params!.length === 1 && hash === null
    );
  }

  let expr: WireFormat.Expressions.Helper = [WireFormat.Ops.Helper, '-mount', params || [], hash];
  builder.dynamicComponent(expr, [], null, false, null, null);
  return true;
}

class DynamicEngineReference {
  public tag: Tag;
  public nameRef: VersionedPathReference<any | null | undefined>;
  public modelRef: VersionedPathReference<Opaque> | undefined;
  public env: Environment;
  private _lastName: string | null;
  private _lastDef: CurriedComponentDefinition | null;
  constructor(
    nameRef: VersionedPathReference<any | undefined | null>,
    env: Environment,
    modelRef: VersionedPathReference<Opaque> | undefined
  ) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.modelRef = modelRef;
    this.env = env;
    this._lastName = null;
    this._lastDef = null;
  }

  value() {
    let { env, nameRef, modelRef } = this;
    let name = nameRef.value();

    if (typeof name === 'string') {
      if (this._lastName === name) {
        return this._lastDef;
      }

      assert(
        `You used \`{{mount '${name}'}}\`, but the engine '${name}' can not be found.`,
        env.owner.hasRegistration(`engine:${name}`)
      );

      if (!env.owner.hasRegistration(`engine:${name}`)) {
        return null;
      }

      this._lastName = name;
      this._lastDef = curry(new MountDefinition(name, modelRef));

      return this._lastDef;
    } else {
      assert(
        `Invalid engine name '${name}' specified, engine name must be either a string, null or undefined.`,
        name === null || name === undefined
      );
      this._lastDef = null;
      this._lastName = null;
      return null;
    }
  }

  get() {
    return UNDEFINED_REFERENCE;
  }
}
