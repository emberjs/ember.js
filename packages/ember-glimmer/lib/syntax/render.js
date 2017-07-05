/**
@module ember
@submodule ember-glimmer
*/

import { ConstReference, isConst } from '@glimmer/reference';
import { assert } from 'ember-debug';
import { hashToArgs } from './utils';
import {
  RenderDefinition,
  SINGLETON_RENDER_MANAGER,
  NON_SINGLETON_RENDER_MANAGER
} from '../component-managers/render';

function makeComponentDefinition(vm, args) {
  let env     = vm.env;
  let nameRef = args.positional.at(0);

  assert(`The first argument of {{render}} must be quoted, e.g. {{render "sidebar"}}.`, isConst(nameRef));
  assert(`The second argument of {{render}} must be a path, e.g. {{render "post" post}}.`, args.positional.length === 1 || !isConst(args.positional.at(1)));

  let templateName = nameRef.value();

  assert(`You used \`{{render '${templateName}'}}\`, but '${templateName}' can not be found as a template.`, env.owner.hasRegistration(`template:${templateName}`));

  let template = env.owner.lookup(`template:${templateName}`);

  let controllerName;

  if (args.named.has('controller')) {
    let controllerNameRef = args.named.get('controller');

    assert(`The controller argument for {{render}} must be quoted, e.g. {{render "sidebar" controller="foo"}}.`, isConst(controllerNameRef));

    controllerName = controllerNameRef.value();

    assert(`The controller name you supplied '${controllerName}' did not resolve to a controller.`, env.owner.hasRegistration(`controller:${controllerName}`));
  } else {
    controllerName = templateName;
  }

  if (args.positional.length === 1) {
    return new ConstReference(new RenderDefinition(controllerName, template, env, SINGLETON_RENDER_MANAGER));
  } else {
    return new ConstReference(new RenderDefinition(controllerName, template, env, NON_SINGLETON_RENDER_MANAGER));
  }
}


/**
  Calling ``{{render}}`` from within a template will insert another
  template that matches the provided name. The inserted template will
  access its properties on its own controller (rather than the controller
  of the parent template).

  If a view class with the same name exists, the view class also will be used.
  Note: A given controller may only be used *once* in your app in this manner.
  A singleton instance of the controller will be created for you.

  Example:

  ```javascript
  App.NavigationController = Ember.Controller.extend({
    who: "world"
  });
  ```

  ```handlebars
  <!-- navigation.hbs -->
  Hello, {{who}}.
  ```

  ```handlebars
  <!-- application.hbs -->
  <h1>My great app</h1>
  {{render "navigation"}}
  ```

  ```html
  <h1>My great app</h1>
  <div class='ember-view'>
    Hello, world.
  </div>
  ```

  Optionally you may provide a second argument: a property path
  that will be bound to the `model` property of the controller.
  If a `model` property path is specified, then a new instance of the
  controller will be created and `{{render}}` can be used multiple times
  with the same name.

  For example if you had this `author` template.

  ```handlebars
  <div class="author">
    Written by {{firstName}} {{lastName}}.
    Total Posts: {{postCount}}
  </div>
  ```

  You could render it inside the `post` template using the `render` helper.

  ```handlebars
  <div class="post">
    <h1>{{title}}</h1>
    <div>{{body}}</div>
    {{render "author" author}}
  </div>
  ```

  @method render
  @for Ember.Templates.helpers
  @param {String} name
  @param {Object?} context
  @param {Hash} options
  @return {String} HTML string
  @public
  @deprecated Use a component instead
*/
export function renderMacro(name, params, hash, builder) {
  if (!params) {
    params = [];
  }
  let definitionArgs = [params.slice(0), hash, null, null];
  let args = [params.slice(1), hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, makeComponentDefinition, args);
  return true;
}
