import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { Factory, FactoryClass, LookupOptions, Owner } from '@ember/-internals/owner';
import { OwnedTemplateMeta } from '@ember/-internals/views';
import {
  EMBER_GLIMMER_SET_COMPONENT_TEMPLATE,
  EMBER_MODULE_UNIFICATION,
} from '@ember/canary-features';
import { isTemplateOnlyComponent } from '@ember/component/template-only';
import { assert, deprecate } from '@ember/debug';
import { PARTIALS } from '@ember/deprecated-features';
import EmberError from '@ember/error';
import { _instrumentStart } from '@ember/instrumentation';
import { DEBUG } from '@glimmer/env';

import { ComponentDefinition, Helper, JitRuntimeResolver, Option } from '@glimmer/interfaces';
import { PartialDefinition, unwrapTemplate } from '@glimmer/opcode-compiler';
import { getDynamicVar, ModifierDefinition } from '@glimmer/runtime';
import { CurlyComponentDefinition } from './component-managers/curly';
import { CustomManagerDefinition, ManagerDelegate } from './component-managers/custom';
import InternalComponentManager, {
  InternalComponentDefinition,
} from './component-managers/internal';
import { TemplateOnlyComponentDefinition } from './component-managers/template-only';
import { isHelperFactory, isSimpleHelper } from './helper';
import { default as componentAssertionHelper } from './helpers/-assert-implicit-component-helper-argument';
import { default as inputTypeHelper } from './helpers/-input-type';
import { default as normalizeClassHelper } from './helpers/-normalize-class';
import { default as trackArray } from './helpers/-track-array';
import { default as action } from './helpers/action';
import { default as array } from './helpers/array';
import { default as concat } from './helpers/concat';
import { default as eachIn } from './helpers/each-in';
import { default as fn } from './helpers/fn';
import { default as get } from './helpers/get';
import { default as hash } from './helpers/hash';
import { inlineIf, inlineUnless } from './helpers/if-unless';
import { default as log } from './helpers/log';
import { default as mut } from './helpers/mut';
import { default as queryParams } from './helpers/query-param';
import { default as readonly } from './helpers/readonly';
import { default as unbound } from './helpers/unbound';
import ActionModifierManager from './modifiers/action';
import { CustomModifierDefinition, ModifierManagerDelegate } from './modifiers/custom';
import OnModifierManager from './modifiers/on';
import { mountHelper } from './syntax/mount';
import { outletHelper } from './syntax/outlet';
import { Factory as TemplateFactory, OwnedTemplate } from './template';
import { getComponentTemplate } from './utils/component-template';
import { getModifierManager } from './utils/custom-modifier-manager';
import { getManager } from './utils/managers';
import { EmberHelperRootReference } from './utils/references';

function instrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function makeOptions(moduleName: string, namespace?: string): LookupOptions {
  return {
    source: moduleName !== undefined ? `template:${moduleName}` : undefined,
    namespace,
  };
}

function componentFor(
  name: string,
  owner: Owner,
  options?: LookupOptions
): Option<Factory<{}, {}>> {
  let fullName = `component:${name}`;
  return owner.factoryFor(fullName, options) || null;
}

function layoutFor(name: string, owner: Owner, options?: LookupOptions): Option<OwnedTemplate> {
  let templateFullName = `template:components/${name}`;

  return owner.lookup(templateFullName, options) || null;
}

function lookupModuleUnificationComponentPair(
  owner: Owner,
  name: string,
  options?: LookupOptions
): Option<LookupResult> {
  let localComponent = componentFor(name, owner, options);
  let localLayout = layoutFor(name, owner, options);

  let globalComponent = componentFor(name, owner);
  let globalLayout = layoutFor(name, owner);

  // TODO: we shouldn't have to recheck fallback, we should have a lookup that doesn't fallback
  if (
    localComponent !== null &&
    globalComponent !== null &&
    globalComponent.class === localComponent.class
  ) {
    localComponent = null;
  }
  if (
    localLayout !== null &&
    globalLayout !== null &&
    unwrapTemplate(localLayout).referrer.moduleName ===
      unwrapTemplate(globalLayout).referrer.moduleName
  ) {
    localLayout = null;
  }

  if (localComponent !== null || localLayout !== null) {
    return { component: localComponent, layout: localLayout } as LookupResult;
  } else if (globalComponent !== null || globalLayout !== null) {
    return { component: globalComponent, layout: globalLayout } as LookupResult;
  } else {
    return null;
  }
}

type LookupResult =
  | {
      component: Factory<{}, {}>;
      layout: TemplateFactory;
    }
  | {
      component: Factory<{}, {}>;
      layout: null;
    }
  | {
      component: null;
      layout: TemplateFactory;
    };

function lookupComponentPair(
  owner: Owner,
  name: string,
  options?: LookupOptions
): Option<LookupResult> {
  let component = componentFor(name, owner, options);

  if (EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
    if (component !== null && component.class !== undefined) {
      let layout = getComponentTemplate(component.class);

      if (layout !== null) {
        return { component, layout };
      }
    }
  }

  let layout = layoutFor(name, owner, options);

  if (component === null && layout === null) {
    return null;
  } else {
    return { component, layout } as LookupResult;
  }
}

function lookupComponent(owner: Owner, name: string, options: LookupOptions): Option<LookupResult> {
  if (options.source || options.namespace) {
    if (EMBER_MODULE_UNIFICATION) {
      return lookupModuleUnificationComponentPair(owner, name, options);
    }

    let pair = lookupComponentPair(owner, name, options);

    if (pair !== null) {
      return pair;
    }
  }

  if (EMBER_MODULE_UNIFICATION) {
    return lookupModuleUnificationComponentPair(owner, name);
  }

  return lookupComponentPair(owner, name);
}

let lookupPartial: { templateName: string; owner: Owner } | any;
let templateFor: { owner: Owner; underscored: string; name: string } | any;
let parseUnderscoredName: { templateName: string } | any;

if (PARTIALS) {
  lookupPartial = function(templateName: string, owner: Owner) {
    deprecate(
      `The use of \`{{partial}}\` is deprecated, please refactor the "${templateName}" partial to a component`,
      false,
      {
        id: 'ember-views.partial',
        until: '4.0.0',
        url: 'https://deprecations.emberjs.com/v3.x#toc_ember-views-partial',
      }
    );

    if (templateName === null) {
      return;
    }

    let template = templateFor(owner, parseUnderscoredName(templateName), templateName);

    assert(`Unable to find partial with name "${templateName}"`, Boolean(template));

    return template;
  };

  templateFor = function(owner: any, underscored: string, name: string) {
    if (PARTIALS) {
      if (!name) {
        return;
      }
      assert(`templateNames are not allowed to contain periods: ${name}`, name.indexOf('.') === -1);

      if (!owner) {
        throw new EmberError(
          'Container was not found when looking up a views template. ' +
            'This is most likely due to manually instantiating an Ember.View. ' +
            'See: http://git.io/EKPpnA'
        );
      }

      return owner.lookup(`template:${underscored}`) || owner.lookup(`template:${name}`);
    }
  };

  parseUnderscoredName = function(templateName: string) {
    let nameParts = templateName.split('/');
    let lastPart = nameParts[nameParts.length - 1];

    nameParts[nameParts.length - 1] = `_${lastPart}`;

    return nameParts.join('/');
  };
}

interface IBuiltInHelpers {
  [name: string]: Helper | undefined;
}

const BUILTINS_HELPERS: IBuiltInHelpers = {
  if: inlineIf,
  action,
  array,
  concat,
  fn,
  get,
  hash,
  log,
  mut,
  'query-params': queryParams,
  readonly,
  unbound,
  unless: inlineUnless,
  '-each-in': eachIn,
  '-input-type': inputTypeHelper,
  '-normalize-class': normalizeClassHelper,
  '-track-array': trackArray,
  '-get-dynamic-var': getDynamicVar,
  '-mount': mountHelper,
  '-outlet': outletHelper,
  '-assert-implicit-component-helper-argument': componentAssertionHelper,
};

interface IBuiltInModifiers {
  [name: string]: ModifierDefinition | undefined;
}

export default class RuntimeResolver implements JitRuntimeResolver<OwnedTemplateMeta> {
  public isInteractive: boolean;
  // public compiler: LazyCompiler<OwnedTemplateMeta>;

  private handles: any[] = [
    undefined, // ensure no falsy handle
  ];
  private objToHandle = new WeakMap<any, number>();

  private builtInHelpers: IBuiltInHelpers = BUILTINS_HELPERS;

  private builtInModifiers: IBuiltInModifiers;

  private componentDefinitionCache: Map<object, ComponentDefinition | null> = new Map();

  public componentDefinitionCount = 0;
  public helperDefinitionCount = 0;

  constructor(isInteractive: boolean) {
    // this.compiler = new LazyCompiler<OwnedTemplateMeta>(new CompileTimeLookup(this), this, macros);
    this.isInteractive = isInteractive;

    this.builtInModifiers = {
      action: { manager: new ActionModifierManager(), state: null },
      on: { manager: new OnModifierManager(isInteractive), state: null },
    };
  }

  /***  IRuntimeResolver ***/

  /**
   * public componentDefHandleCount = 0;
   * Called while executing Append Op.PushDynamicComponentManager if string
   */
  lookupComponent(name: string, meta: OwnedTemplateMeta): Option<ComponentDefinition> {
    let handle = this.lookupComponentHandle(name, meta);
    if (handle === null) {
      assert(
        `Could not find component named "${name}" (no component or template with that name was found)`
      );
      return null;
    }
    return this.resolve(handle);
  }

  lookupComponentHandle(name: string, meta: OwnedTemplateMeta) {
    let nextHandle = this.handles.length;
    let handle = this.handle(this._lookupComponentDefinition(name, meta));

    assert(
      'Could not find component `<TextArea />` (did you mean `<Textarea />`?)',
      !(name === 'text-area' && handle === null)
    );

    if (nextHandle === handle) {
      this.componentDefinitionCount++;
    }
    return handle;
  }

  /**
   * Called by RuntimeConstants to lookup unresolved handles.
   */
  resolve<U>(handle: number): U {
    return this.handles[handle];
  }
  // End IRuntimeResolver

  /**
   * Called by CompileTimeLookup compiling Unknown or Helper OpCode
   */
  lookupHelper(name: string, meta: OwnedTemplateMeta): Option<number> {
    let nextHandle = this.handles.length;
    let helper = this._lookupHelper(name, meta);
    if (helper !== null) {
      let handle = this.handle(helper);

      if (nextHandle === handle) {
        this.helperDefinitionCount++;
      }
      return handle;
    }
    return null;
  }

  /**
   * Called by CompileTimeLookup compiling the
   */
  lookupModifier(name: string, meta: OwnedTemplateMeta): Option<number> {
    return this.handle(this._lookupModifier(name, meta));
  }

  /**
   * Called by CompileTimeLookup to lookup partial
   */
  lookupPartial(name: string, meta: OwnedTemplateMeta): Option<number> {
    if (PARTIALS) {
      let partial = this._lookupPartial(name, meta);
      return this.handle(partial);
    } else {
      return null;
    }
  }

  // TODO: Do we need this?
  compilable(): any {}

  // end CompileTimeLookup

  // needed for lazy compile time lookup
  private handle(obj: unknown) {
    if (obj === undefined || obj === null) {
      return null;
    }
    let handle: number | undefined = this.objToHandle.get(obj);
    if (handle === undefined) {
      handle = this.handles.push(obj) - 1;
      this.objToHandle.set(obj, handle);
    }
    return handle;
  }

  private _lookupHelper(_name: string, meta: OwnedTemplateMeta): Option<Helper> {
    assert(
      `You attempted to overwrite the built-in helper "${_name}" which is not allowed. Please rename the helper.`,
      !(this.builtInHelpers[_name] && meta.owner.hasRegistration(`helper:${_name}`))
    );

    const helper = this.builtInHelpers[_name];
    if (helper !== undefined) {
      return helper;
    }

    const { owner, moduleName } = meta;

    let name = _name;
    let namespace = undefined;
    if (EMBER_MODULE_UNIFICATION) {
      const parsed = this._parseNameForNamespace(_name);
      name = parsed.name;
      namespace = parsed.namespace;
    }

    const options: LookupOptions = makeOptions(moduleName, namespace);

    const factory =
      owner.factoryFor(`helper:${name}`, options) || owner.factoryFor(`helper:${name}`);

    if (!isHelperFactory(factory)) {
      return null;
    }

    return (args, vm) => {
      const helper = factory.create();

      if (!isSimpleHelper(helper)) {
        vm.associateDestroyable(helper);
      } else if (DEBUG) {
        // TODO: Give this a better error message
        helper.compute = helper.compute.bind(null);
      }

      return new EmberHelperRootReference(helper, args.capture(), vm.env);
    };
  }

  private _lookupPartial(name: string, meta: OwnedTemplateMeta): PartialDefinition {
    let templateFactory = lookupPartial(name, meta.owner);
    let template = templateFactory(meta.owner);

    return new PartialDefinition(name, template);
  }

  private _lookupModifier(name: string, meta: OwnedTemplateMeta) {
    let builtin = this.builtInModifiers[name];

    if (builtin === undefined) {
      let { owner } = meta;
      let modifier = owner.factoryFor<unknown, FactoryClass>(`modifier:${name}`);
      if (modifier !== undefined) {
        let managerFactory = getModifierManager<ModifierManagerDelegate<unknown>>(modifier.class);
        let manager = managerFactory!(owner);

        return new CustomModifierDefinition(name, modifier, manager, this.isInteractive);
      }
    }

    return builtin;
  }

  private _parseNameForNamespace(_name: string) {
    let name = _name;
    let namespace = undefined;
    let namespaceDelimiterOffset = _name.indexOf('::');
    if (namespaceDelimiterOffset !== -1) {
      name = _name.slice(namespaceDelimiterOffset + 2);
      namespace = _name.slice(0, namespaceDelimiterOffset);
    }

    return { name, namespace };
  }

  private _lookupComponentDefinition(
    _name: string,
    { moduleName, owner }: OwnedTemplateMeta
  ): Option<ComponentDefinition> {
    let name = _name;
    let namespace = undefined;
    if (EMBER_MODULE_UNIFICATION) {
      const parsed = this._parseNameForNamespace(_name);
      name = parsed.name;
      namespace = parsed.namespace;
    }
    let pair = lookupComponent(owner, name, makeOptions(moduleName, namespace));
    if (pair === null) {
      return null;
    }

    let layout: OwnedTemplate | undefined;
    let key: object;

    if (pair.component === null) {
      key = layout = pair.layout!(owner);
    } else {
      key = pair.component;
    }

    let cachedComponentDefinition = this.componentDefinitionCache.get(key);
    if (cachedComponentDefinition !== undefined) {
      return cachedComponentDefinition;
    }

    if (layout === undefined && pair.layout !== null) {
      layout = pair.layout(owner);
    }

    let finalizer = _instrumentStart('render.getComponentDefinition', instrumentationPayload, name);

    let definition: Option<ComponentDefinition> = null;

    if (pair.component === null) {
      if (ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS) {
        definition = new TemplateOnlyComponentDefinition(name, layout!);
      }
    } else if (
      EMBER_GLIMMER_SET_COMPONENT_TEMPLATE &&
      isTemplateOnlyComponent(pair.component.class)
    ) {
      definition = new TemplateOnlyComponentDefinition(name, layout!);
    }

    if (pair.component !== null) {
      assert(`missing component class ${name}`, pair.component.class !== undefined);

      let ComponentClass = pair.component.class!;
      let wrapper = getManager(ComponentClass);

      if (wrapper !== null && wrapper.type === 'component') {
        let { factory } = wrapper;

        if (wrapper.internal) {
          assert(`missing layout for internal component ${name}`, pair.layout !== null);

          definition = new InternalComponentDefinition(
            factory(owner) as InternalComponentManager<unknown>,
            ComponentClass as Factory<any, any>,
            layout!
          );
        } else {
          definition = new CustomManagerDefinition(
            name,
            pair.component,
            factory(owner) as ManagerDelegate<unknown>,
            layout !== undefined
              ? layout
              : owner.lookup<TemplateFactory>(P`template:components/-default`)!(owner)
          );
        }
      }
    }

    if (definition === null) {
      definition = new CurlyComponentDefinition(
        name,
        pair.component || owner.factoryFor(P`component:-default`),
        layout
      );
    }

    finalizer();
    this.componentDefinitionCache.set(key, definition);
    return definition;
  }
}
