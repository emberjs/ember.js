/**
@module ember
*/
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments, Option, VM, VMArguments } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import {
  CurriedComponentDefinition,
  curry,
  EMPTY_ARGS,
  UNDEFINED_REFERENCE,
} from '@glimmer/runtime';
import { Tag } from '@glimmer/validator';
import { MODEL_ARG_NAME, MountDefinition } from '../component-managers/mount';
import { EmberVMEnvironment } from '../environment';

export function mountHelper(
  args: VMArguments,
  vm: VM
): VersionedPathReference<CurriedComponentDefinition | null> {
  let env = vm.env as EmberVMEnvironment;
  let nameRef = args.positional.at(0);
  let captured: Option<CapturedArguments> = null;

  assert(
    'You can only pass a single positional argument to the {{mount}} helper, e.g. {{mount "chat-engine"}}.',
    args.positional.length === 1
  );

  if (DEBUG && args.named) {
    let keys = args.named.names;
    let extra = keys.filter(k => k !== 'model');

    assert(
      'You can only pass a `model` argument to the {{mount}} helper, ' +
        'e.g. {{mount "profile-engine" model=this.profile}}. ' +
        `You passed ${extra.join(',')}.`,
      extra.length === 0
    );
  }

  // TODO: the functionailty to create a proper CapturedArgument should be
  // exported by glimmer, or that it should provide an overload for `curry`
  // that takes `PreparedArguments`
  if (args.named.has('model')) {
    assert('[BUG] this should already be checked by the macro', args.named.length === 1);

    let named = args.named.capture();
    let { tag } = named;

    // TODO delete me after EMBER_ROUTING_MODEL_ARG has shipped
    if (DEBUG && MODEL_ARG_NAME !== 'model') {
      assert('[BUG] named._map is not null', named['_map'] === null);
      named.names = [MODEL_ARG_NAME];
    }

    captured = {
      tag,
      positional: EMPTY_ARGS.positional,
      named,
      length: 1,
      value() {
        return {
          named: this.named.value(),
          positional: this.positional.value(),
        };
      },
    };
  }

  return new DynamicEngineReference(nameRef, env, captured);
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
  @public
*/

class DynamicEngineReference implements VersionedPathReference<Option<CurriedComponentDefinition>> {
  public tag: Tag;
  private _lastName: Option<string> = null;
  private _lastDef: Option<CurriedComponentDefinition> = null;

  constructor(
    public nameRef: VersionedPathReference<any | undefined | null>,
    public env: EmberVMEnvironment,
    public args: Option<CapturedArguments>
  ) {
    this.tag = nameRef.tag;
  }

  value(): Option<CurriedComponentDefinition> {
    let { env, nameRef, args } = this;
    let name = nameRef.value();

    if (typeof name === 'string') {
      if (this._lastName === name) {
        return this._lastDef;
      }

      assert(
        `You used \`{{mount '${name}'}}\`, but the engine '${name}' can not be found.`,
        env.extra.owner.hasRegistration(`engine:${name}`)
      );

      if (!env.extra.owner.hasRegistration(`engine:${name}`)) {
        return null;
      }

      this._lastName = name;
      this._lastDef = curry(new MountDefinition(name), args);

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
