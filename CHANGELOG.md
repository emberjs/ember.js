# Ember Changelog

### 1.10.1 (April 14, 2014)

* [CVE-2015-1866] Ember.js XSS Vulnerability With {{view "select"}} Options`

### 1.10.0 (February 7, 2015)

* [BUGFIX] Ensure that property case is normalized.
* [BUGFIX] Prevent an error from being thrown if the errorThrown property is a string when catching unhandled promise rejections.
* [BUGFIX] `contenteditable` elements should fire focus events in `ember-testing` click helper.
* [BUGFIX] Remove HTMLBars from builds `ember.debug.js` and `ember.prod.js` builds. Please see http://emberjs.com/blog/2015/02/05/compiling-templates-in-1-10-0.html for more details.
* [BUGFIX] Ensure that calling the `wait` testing helpe without routing works properly.
* [BUGFIX] Ensure that a plus sign in query params are treated as spaces.
* [BUGFIX] Fix broken `Ember.Test.unregisterWaiter` semantics.
* [BUGFIX] Allow unbound helpers to add attributes.
* [BUGFIX] Ensure compat helpers calling `options.fn` work.
* [BUGFIX] Fix memory leak in view streams.
* [BUGFIX] Don't render default layout for `Ember.TextField`.
* Update HTMLBars version to v0.8.5:
  * Allow numbers to be parsed as HTML in IE.
  * Add namespace detection.
  * Include line number in error thrown for unclosed HTML element.
  * `removeAttribute` fix for IE <11 and SVG.
  * Disable `cloneNodes` in IE8.
  * Improve HTML validation and error messages thrown.
  * Fix a number of template compliation issues in IE8.
  * Use the correct namespace in `parseHTML` (fixes various issues that occur
    when changing to and from alternate namespaces).
  * Ensure values are converted to `String`'s when setting attributes (fixes issues in IE10 & IE11).
  * Change `setProperty` and `morph` to remove an `undefined` attr value.
* Remove dots from default resolver descriptions.
* Add helpful assertion if a block helper is not found.
* Make Ember.HTMLBars version of registerHelper private.
* [BUGFIX] Add `options.types` and `options.hashTypes` for Handlebars compatible helpers.
* [BUGFIX] Fix usage of `emptyView` with `{{#each}}` helper.
* Assert if an attribute set statically and via bind-attr.  For example:
  `<div class="foo" {{bind-attr class="bar"}}></div>` will now trigger an assertion (instead of
  silently failing).
* [BUGFIX] Fix deprecated bindAttr helper.
* [BUGFIX] Do not allow both keyword and block params.
* Cleanup HTMLBars public API
  * Remove `Ember.HTMLBars.helper`.
  * Remove internal `registerBoundHelper` function (use
    `registerHelper('blah', makeViewHelper(SomeView))` or `registerHelper('blah', makeBoundHelper(func))`).
* [BUGFIX] Fix Handlebars compat mode `registerHelper` interop with `makeViewHelper`.
* [BUGFIX] Ensure that `mergedProperties` are properly merged when all properties are not present.
* Add options argument to pass url to `Ember.deprecate`.
* Deprecate `{{bind}}` helper.
* Pass array to `Ember.computed.filter` callback
* [BUGFIX] Prevent mandatory-setter when setter is already present.
* Remove Handlebars from dependencies.
* Fix error when parsing templates with invalid end tags.
* [BUGFIX] Allow makeBoundHelper to be a sub-expression.
* [BUGFIX] Allow compat makeBoundHelpers to be sub-expressions.
* [BUGFIX] Export Ember.Handlebars compat shim for `Ember.Handlebars.SafeString` and `Ember.Handlebars.Utils.escapeExpression`.
* [BUGFIX] Allow `Ember.inject` injected properties to be overridden (makes testing significantly easier).
* [BUGFIX] Don’t assert uncaught RSVP rejections. We are already logging the error, but asserting breaks everything else on the run loop queue.
* [BUGFIX] Allow tagName to be a CP (with deprecation).
* [BUGFIX] Allow view instances in {{view}}.
* [BUGFIX] Ensure bound attrs flush immediately.
* [PERFORMANCE] Initialize views in preRender state.
* [PERFORMANCE] `View#element` should not be observable.
* Add ember-template-compiler package.
* Rename `Ember.HTMLBars.registerASTPlugin` to `Ember.HTMLBars.registerPlugin`.
* Export `ember-template-compiler.js`.
* Escape `href`, `src`, and `background` attributes for `a`, `link`, `img`, and `iframe` elements.
* Move debugging file output from `ember.js` to `ember.debug.js`.
* Remove `templateData` property from views.
* Restructure `Ember.libraries` to be more idiomatic.
* Prevent creating an extra view for each select option.
* Deprecate the block form of the bind helper.
* Cleanup `Ember.CoreObject` init argument passing.
* Allow all rejection types to be handled by default RSVP error handler.
* Deprecate setting ContainerView#childViews.
* [FEATURE] ember-htmlbars - Enable the HTMLBars rendering engine.
* [FEATURE] ember-htmlbars-block-params - Enable block params feature for HTMLBars.

### 1.9.0 (December 8, 2014)

* Add deprecation for quoteless outlet names (`{{outlet main}}` should be `{{outlet 'main'}}`).
* [BUGFIX] Update the `Ember.Map#forEach` callback to include the map being iterated over.
* [BUGFIX] Ensure that tagless container views are rendered properly.
* [PERF] `Ember.View#_outlets` is no longer observable.
* [PERF] Avoid extending a view for every `{{each}}`.
* Ensure initializers have a `name` property (provides a helpful assertion if missing).
* [BUILD TOOLING] Enable easier cross-browser testing by publishing builds and tests to S3.
* Enable `Ember.run.join` to return a value even if within an existing run loop.
* Update `Ember.EventDispatcher` to use `Ember.run.join`. This is required so that synchronous
  events (like focus) do not spawn a nested run loop.
* Deprecate context switching for of {{each}}.
* Deprecate context switching form of {{with}}.
* Add improved error message when a component lookup fails.
* Ensure that component actions that are subscribed to, trigger an assertion when unhandled. Consider the following example:

```handlebars
{{!component-a.hbs}}

{{some-other-component action="saveMe"}}
```

Clearly, `component-a` has subscribed to `some-other-component`'s `action`. Previously, if `component-a` did not handle the action
it would silently continue.  Now, an assertion would be triggered.

* [PERF] Speedup Mixin creation.
* [BREAKING] Require Handlebars 2.0. See [blog post](http://emberjs.com/blog/2014/10/16/handlebars-update.html) for details.
* Allow all rejection types in promises to be handled.
* Mandatory setter checks for configurable, and does not clobber non-configurable properties.
* Remove long deprecated `Ember.empty` and `Ember.none`.
* Refactor `Ember.platform`.
* `Ember.HashLocation` no longer assumes any hash is a route, uses forward slash prefix convention `#/foo`.
* Log unhandled promise rejections in testing.
* Deprecate `Ember.Handlebars.get`.
* Warn if FEATURES flagging is used in non-canary, debug builds.
* Streamify template bindings.
* Make Ember.Namespace#toString ember-cli aware.
* Prevent extra `method.toString` checks when setting `_super`.
* [PERF] Speedup watchKey by preventing for in related deopt.
* [FEATURE] ember-routing-fire-activate-deactivate-events.
* [FEATURE] ember-testing-pause-test.

### Ember 1.8.1 (November, 4, 2014)

* [BUGFIX] Make sure that `{{view}}` can accept a Ember.View instance.
* [BUGFIX] Throw an assertion if `classNameBindings` are specified on a tag-less view.
* [BUGFIX] Setting an `attributeBinding` for `class` attribute triggers assertion.
* [BUGFIX] Fix `htmlSafe` to allow non-strings in unescaped code.
* [BUGFIX] Add support for null prototype object to mandatory setter code. Prevents errors when operating on Ember Data `meta` objects.
* [BUGFIX] Fix an issue with select/each that causes the last item rendered to be selected.

### Ember 1.8.1 (November, 4, 2014)

* [BUGFIX] Make sure that `{{view}}` can accept a Ember.View instance.
* [BUGFIX] Throw an assertion if `classNameBindings` are specified on a tag-less view.
* [BUGFIX] Setting an `attributeBinding` for `class` attribute triggers assertion.
* [BUGFIX] Fix `htmlSafe` to allow non-strings in unescaped code.
* [BUGFIX] Add support for null prototype object to mandatory setter code. Prevents errors when operating on Ember Data `meta` objects.
* [BUGFIX] Fix an issue with select/each that causes the last item rendered to be selected.

### Ember 1.8.0 (October, 28, 2014)

* [BUGFIX] Ensure published builds do not use `define` or `require` internally.
* [BUGFIX] Remove strict mode for Object.create usage to work around an [iOS bug](https://bugs.webkit.org/show_bug.cgi?id=138038).
* Enable testing of production builds by publishing `ember-testing.js` along with the standard builds.
* [DOC] Make mandatory setter assertions more helpful.
* Deprecate location: 'hash' paths that don't have a forward slash. e.g. #foo vs. #/foo.
* [BUGFIX] Ensure `Ember.setProperties` can handle non-object properties.
* [BUGFIX] Refactor buffer to be simpler, single parsing code-path.
* [BUGFIX] Add assertion when morph is not found in RenderBuffer.
* [BUGFIX] Make computed.sort generate an answer immediately.
* [BUGFIX] Fix broken `Ember.computed.sort` semantics.
* [BUGFIX] Ensure ember-testing is not included in production build output.
* Deprecate usage of quoted paths in `{{view}}` helper.
* [BUGFIX] Ensure `{{view}}` lookup works properly when name is a keyword.
* [BUGFIX] Ensure `Ember.Map` works properly with falsey values.
* [BUGFIX] Make Ember.Namespace#toString ember-cli aware.
* [PERF] Avoid using `for x in y` in `Ember.RenderBuffer.prototype.add`.
* [BUGFIX] Enable setProperties to work on Object.create(null) objects.
* [PERF] Update RSVP to 3.0.14 (faster instrumentation).
* [BUGFIX] Add SVG support for metal-views.
* [BUGFIX] Allow camelCase attributes in DOM elements.
* [BUGFIX] Update backburner to latest.
* [BUGFIX] Use contextualElements to properly handle omitted optional start tags.
* [BUGFIX] Ensure that `Route.prototype.activate` is not retriggered when the model for the current route changes.
* [PERF] Fix optimization bailouts for `{{view}}` helper.
* [BUGFIX] Add `attributeBindings` for `lang` and `dir` (for bidirectional language support) in `Ember.TextField` and `Ember.TextAra`.
* [BUGFIX] Fix finishChains for all chains that reference an obj not just the ones rooted at that object.
* [BUGFIX] Refactor ES3 `Ember.keys` implementation.
* Rewrite Ember.Map to be faster and closer to ES6 implementation:
  * [PERF + ES6] No longer clone array before enumeration (dramatically reduce allocations)
  * [PERF] Don’t Rebind the callback of forEach if not needed
  * [PERF + ES6] No longer allow Map#length to be bindable
  * [PERF] Don’t double guid keys, as they are passed from map to ordered set (add/remove)
  * [ES6] Deprecate Map#remove in-favor of the es6 Map#delete
  * [ES6] Error if callback is not a function
  * [ES6] Map#set should return the map. This enables chaining map.`map.set(‘foo’,1).set(‘bar’,3);` etc.
  * [ES6] Remove length in-favor of size.
  * [ES6] Throw if constructor is invoked without new
  * [ES6] Make inheritance work correctly
* [BUGFIX] Allow for bound property {{input}} type.
* [BUGFIX] Ensure pushUnique targetQueue is cleared by flush.
* [BUGFIX] instrument should still call block even without subscribers.
* [BUGFIX] Remove uneeded normalization in query param controller lookup.
* [BUGFIX] Do not use defineProperty on each View instance.
* [PERF] Speedup `watchKey` by preventing for in related deopt.
* [PERF] Change `ENV.MANDATORY_SETTER` to FEATURES so it can be compiled out of production builds.
* [PERF] Object.create(null) in Ember.inspect.
* [PERF] Extracts computed property set into a separate function.
* [BUGFIX] Make `GUID_KEY = intern(GUID_KEY)` actually work on ES3.
* [BUGFIX] Ensure nested routes can inherit model from parent.
* Remove `metamorph` in favor of `morph` package (removes the need for `<script>` tags in the DOM).
* [FEATURE] ember-routing-linkto-target-attribute
* [FEATURE] ember-routing-multi-current-when
* [FEATURE] ember-routing-auto-location-uses-replace-state-for-history
* [FEATURE] ember-metal-is-present
* [FEATURE] property-brace-expansion-improvement
* Deprecate usage of Internet Explorer 6 & 7.
* Deprecate global access to view classes from template (see the [deprecation guide](http://emberjs.com/guides/deprecations/)).
* Deprecate `Ember.Set` (note: this is NOT the `Ember.set`).
* Deprecate `Ember.computed.defaultTo`.
* Remove long deprecated `Ember.StateManager` warnings.
* Use intelligent caching for `Ember.String` (`camelize`, `dasherize`, etc.).
* Use intelligent caching for container normalization.
* Polyfill `Object.create` (use for new caching techniques).
* Refactor internals to make debugging easier (use a single assignment per `var` statement).
* [BREAKING] Remove deprecated controller action lookup. Support for pre-1.0.0 applications with actions in the root
  of the controller (instead of inside the `actions` hash) has been removed.
* [BREAKING] Ember.View didInsertElement is now called on child views before their parents. Before
  1.8.0-beta.1 it would be called top-down.

### Ember 1.7.0 (August 19, 2014)

* Update `Ember.computed.notEmpty` to properly respect arrays.
* Bind `tabindex` property on LinkView.
* Update to RSVP 3.0.13 (fixes an error with `RSVP.hash` in IE8 amongst other changes).
* Fix incorrect quoteless action deprecation warnings.
* Prevent duplicate message getting printed by errors in Route hooks.
* Deprecate observing container views like arrays.
* Add `catch` and `finally` to Transition.
* [BUGFIX] paramsFor: don’t clobber falsy params.
* [BUGFIX] Controllers with query params are unit testable.
* [BUGFIX] Controllers have new QP values before setupController.
* [BUGFIX] Fix initial render of {{input type=bound}} for checkboxes.
* [BUGFIX] makeBoundHelper supports unquoted bound property options.
* [BUGFIX] link-to helper can be inserted in DOM when the router is not present.
* [PERFORMANCE] Do not pass `arguments` around in a hot-path.
* Remove Container.defaultContainer.
* Polyfill contains for older browsers.
* [BUGFIX] Ensure that `triggerEvent` handles all argument signatures properly.
* [BUGFIX] Stub meta on AliasedProperty (fixes regression from beta.2 with Ember Data).
* [DOC] Fixed issue with docs showing 'Ember.run' as 'run.run'.
* [BUGFIX] SimpleHandlebarsView should not re-render if normalized value is unchanged.
* Allow Router DSL to nest routes via `this.route`.
* [BUGFIX] Don't pass function UNDEFINED as oldValue to computed properties.
* [BUGFIX] dramatically improve performance of eachComputedProperty.
* [BUGFIX] Prevent strict mode errors from superWrapper.
* Deprecate Ember.DeferredMixin and Ember.Deferred.
* Deprecate `.then` on Ember.Application.
* Revert ember-routing-consistent-resources.
* [BUGFIX] Wrap es3 keywords in quotes.
* [BUGFIX] Use injected integration test helpers instead of local functions.
* [BUGFIX] Add alias descriptor, and replace `Ember.computed.alias` with new descriptor.
* [BUGFIX] Fix `{{#with view.foo as bar}}`.
* [BUGFIX] Force remove `required` attribute for IE8.
* [BUGFIX] Controller precendence for `Ember.Route.prototype.render` updated.
* [BUGFIX] fixes variable argument passing to triggerEvent helper.
* [BUGFIX] Use view:toplevel for {{view}} instead of view:default.
* [BUGFIX] Do not throw uncaught errors mid-transition.
* [BUGFIX] Don't assume that the router has a container.
* Fix components inside group helper.
* [BUGFIX] Fix wrong view keyword in a component block.
* Update to RSVP 3.0.7.
* [FEATURE query-params-new]
* [FEATURE ember-routing-consistent-resources]
* `uuid` is now consistently used across the project.
* `Ember.uuid` is now an internal function instead of a property on `Ember` itself.
* [BUGFIX] sync back burner: workaround IE's issue with try/finally without Catch.
  Also no longer force deoptimization of the run loop queue flush.
* [BREAKING BUGFIX] An empty array is treated as falsy value in `bind-attr` to be in consistent
  with `if` helper. Breaking for apps that relies on the previous behaviour which treats an empty
  array as truthy value in `bind-attr`.
* [BREAKING BUGFIX] On Controllers, the content property is now derived from model. This reduces many
  caveats with model/content, and also sets a simple ground rule: Never set a controllers content,
  rather always set it's model and ember will do the right thing.

### Ember 1.6.1 (July, 15, 2014)

* Fix error routes/templates. Changes in router promise logging caused errors to be
  thrown mid-transition into the `error` route. See [#5166](https://github.com/emberjs/ember.js/pull/5166) for further details.

### Ember 1.6.0 (July, 7, 2014)

* [BREAKING BUGFIX] An empty array is treated as falsy value in `bind-attr` to be in consistent
  with `if` helper. Breaking for apps that relies on the previous behaviour which treats an empty
  array as truthy value in `bind-attr`.
* [BUGFIX] Ensure itemController's do not leak by tying them to the parent controller lifecycle.
* [BUGFIX] Spaces in brace expansion throws an error.
* [BUGFIX] Fix `MutableEnumerable.removeObjects`.
* [BUGFIX] Allow controller specified to `{{with}}` to be the target of an action.
* [BUGFIX] Ensure that using keywords syntax (`{{with foo as bar}}`) works when specifying a controller.
* [BUGFIX] Ensure that controllers instantiated by `{{with}}` are properly destroyed.
* [BUGFIX] Wrap the keyword specified in `{{with foo as bar}}` with the controller (if specified).
* [BUGFIX] Fix `Ember.isArray` on IE8.
* [BUGFIX] Update backburner.js to fix issue with IE8.
* [BUGFIX] `Ember.computed.alias` returns value of aliased property upon set.
* Provide better debugging information for view rendering.
* [BUGFIX] Don't fire redirect on parent routes during transitions from one child route to another.
* [BUGFIX] Make errors thrown by Ember use `Ember.Error` consistently.
* [BUGFIX] Ensure controllers instantiated by the `{{render}}` helper are properly torn down.
* [BUGFIX] sync back burner: workaround IE's issue with try/finally without Catch. Also no longer force deoptimization of the run loop queue flush.
* [BUGFIX] Ember.onerror now uses Backburner's error handler.
* [BUGFIX] Do not rely on Array.prototype.map for logging version.
* [BUGFIX] RSVP errors go to Ember.onerror if present.
* [BUGFIX] Ensure context is unchanged when using keywords with itemController.
* [BUGFIX] Does not disregard currentWhen when given explicitly.
* [DOC] Remove private wording from makeBoundHelper.
* [BUGFIX] Invalidate previous sorting if sortProperties changes.
* [BUGFIX] Properly resolve helpers from {{unbound}}.
* [BUGFIX] reduceComputed detect retain:n better. Fixes issue with `Ember.computed.filterBy` erroring when items removed from dependent array.
* [BUGFIX] Namespaces are now required to start with uppercase A-Z.
* [BUGFIX] pass context to sortFunction to avoid calling `__nextSuper` on `undefined`.
* [BUGFIX] Allow setting of `undefined` value to a `content` property.
* [BUGFIX] Resolve bound actionName in Handlebars context instead of direct lookup on target.
* [BUGFIX] isEqual now supports dates.
* [BUGFIX] Add better debugging for DefaultResolver.
* [BUGFIX] {{yield}} works inside a Metamorph'ed component.
* [BUGFIX] Add `title` attribute binding to Ember.TextSupport.
* [BUGFIX] Ember.View's concreteView now asks its parentView's concreteView.
* [BUGFIX] Drop dead code for * in paths.
* [BUGFIX] Route#render name vs viewName precedence fix.
* [BUGFIX] Use parseFloat before incrementing via incrementProperty.
* [BUGFIX] Add `which` attribute to event triggered by keyEvent test helper.
* [Performance] Improve cache lookup throughput.
* [FEATURE ember-routing-add-model-option]
* [FEATURE ember-runtime-test-friendly-promises]
* [FEATURE ember-metal-computed-empty-array]

### Ember 1.5.0 (March 29, 2014)

* [BUGFIX beta] Move reduceComputed instanceMetas into object's meta.
* [BUGFIX beta] Total invalidation of arrayComputed by non-array dependencies should be synchronous.
* [BUGFIX] run.bind keeps the arguments from the callback.
* [BUGFIX] Do not attach new listeners on each setupForTesting call.
* [BUGFIX] Ember.copy now supports Date.
* [BUGFIX] Add `which` attribute to event triggered by test helper.
* [BUGFIX beta] The `each` helper checks that the metamorph tags have the same parent.
* Allow Ember Inspector to access models with custom resolver.
* [BUGFIX] Allow components with layoutName specified by parent class to specify templateName.
* [BUGFIX] Don't raise error when a destroyed array is assigned to ArrayProxy.
* [BUGFIX] Use better ajax events for ember-testing counters.
* [BUGFIX] Move AJAX listeners into Ember.setupForTesting.
* [BUGFIX] PromiseProxyMixin reset isFulfilled and isRejected.
* Use documentElement instead of body for ember-extension detection.
* Many documentation updates.
* [SECURITY] Ensure that `ember-routing-auto-location` cannot be forced to redirect to another domain.
* [BUGFIX beta] Handle ES6 transpiler errors.
* [BUGFIX beta] Ensure namespaces are cleaned up.
* [FEATURE ember-handlebars-log-primitives]
* [FEATURE ember-testing-routing-helpers]
* [FEATURE ember-testing-triggerEvent-helper]
* [FEATURE computed-read-only]
* [FEATURE ember-metal-is-blank]
* [FEATURE ember-eager-url-update]
* [FEATURE ember-routing-auto-location]
* [FEATURE ember-routing-bound-action-name]
* [FEATURE ember-routing-inherits-parent-model]
* [BREAKING CHANGE] `Ember.run.throttle` now supports leading edge execution. To follow industry standard leading edge is the default.
* [BUGFIX] Fixed how parentController property of an itemController when nested. Breaking for apps that rely on previous broken behavior of an itemController's `parentController` property skipping its ArrayController when nested.

### Ember 1.4.0 (February 13, 2014)

* [SECURITY] Ensure link-to non-block escapes title.
* Deprecate quoteless action names.
* [BUGFIX] Make Ember.RenderBuffer#addClass work as expected.
* [DOC] Display Ember Inspector hint in Firefox.
* [BUGFIX] App.destroy resets routes before destroying the container.
* [BUGFIX] reduceComputed fires observers when invalidating with undefined.
* [BUGFIX] Provide helpful error even if Model isn't found.
* [BUGFIX] Do not deprecate the block form of {{render}}.
* [BUGFIX] allow enumerable/any to match undefined as value
* [BUGFIX] Allow canceling of Timers in IE8.
* [BUGFIX] Calling toString at extend time causes Ember.View to memoize and return the same value for different instances.
* [BUGFIX] Fix ember-testing-lazy-routing.
* [BUGFIX] Fixed how parentController property of an itemController when nested. Breaking for apps that rely on previous broken behavior of an itemController's `parentController` property skipping its ArrayController when nested.
* Document the send method on Ember.ActionHandler.
* Document Ember.Route #controllerName and #viewName properties.
* Allow jQuery version 1.11 and 2.1.
* [BUGFIX] Fix stripping trailing slashes for * routes.
* [SECURITY] Ensure primitive value contexts are escaped.
* [SECURITY] Ensure {{group}} helper escapes properly.
* Performance improvements.
* [BUGFIX] Templete-less components properties should not collide with internal properties.
* Unbound helper supports bound helper static strings.
* Preserve `<base>` URL when using history location for routing.
* Begin adding names for anonymous functions to aid in debugging.
* [FEATURE with-controller] {{#with}} can take a controller= option for wrapping the context. Must be an `Ember.ObjectController`
* [FEATURE propertyBraceExpansion] Add support for brace-expansion in dependent keys, observer and watch properties.
* [FEATURE ember-metal-run-bind] Enables `Ember.run.bind` which is ember run-loop aware variation of jQuery.proxy.

### Ember 1.3.1 (January 14, 2014)

* [SECURITY] Ensure primitive value contexts are escaped.
* [SECURITY] Ensure {{group}} helper escapes properly.

### Ember 1.3.0 (January 6, 2014)

* Many documentation updates.
* Update to RSVP 3.0.3.
* Use defeatureify to strip debug statements allowing multi-line assert statements.
* Added fail(), catch() and finally() methods to PromiseProxyMixin.
* [BUGFIX] Add 'view' option to {{outlet}} helper
* Make `Ember.compare` return `date` when appropriate.
* Prefer `EmberENV` over `ENV`, and do not create a global `ENV` if it was not supplied.
* `{{unbound}}` helper supports bound helper static strings.
* [BUGFIX] Make sure mandatory setters don't change default enumerable.
* [BUGFIX] The `render` helper now sets a `parentController` property on the child controller.
* `{{render}}` helper now creates the controller with its model.
* Fix bug in Metamorph.js with nested `if` statements.
* Label promises for debugging.
* Deprecate `RSVP.Promise.prototype.fail`.
* Cleanup header comment: remove duplication and add version.
* [BUGFIX] Do not attempt to serialize undefined models.
* [BUGFIX] Ensure {{link-to}} path observers are reregistered after render.
* [BUGFIX] Ensure that the rootURL is available to location.
* [BUGFIX] Make routePath smarter w/ stacked resource names
* Better link-to error for invalid dest routes
* Use imported handlebars before global Handlebars
* Update router.js
* Update RSVP.js
* Improved a handeful of error messages
* Provide more information for debugging
* Added more assertions and deprecation warnings
* [BUGFIX] Add preventDefault option to link-to and action.
* [BUGFIX] contextualizeBindingPath should be aware of empty paths
* Expose helpful vars in {{debugger}} helper body
* [BUGFIX] container.has should not cause injections to be run.
* [BUGFIX] Make flag LOG_TRANSITIONS_INTERNAL work again
* [BUGFIX] Fix default {{yield}} for Components.
* [BUGFIX] Ensure aliased {{with}} blocks are not shared.
* [BUGFIX] Update to latest Backburner.js.
* [BUGFIX] Fix issue with Ember.Test.unregisterHelper.
* [BUGFIX] Make Ember.Handlebars.makeViewHelper warning useful.
* [FEATURE reduceComputed-non-array-dependencies] `ReduceComputedProperty`s may have non-array dependent keys. When a non-array dependent key changes, the entire property is invalidated.
* [FEATURE ember-testing-lazy-routing] Uses an initializer to defer readiness while testing. Readiness is advanced upon the first call to `visit`.
* [FEATURE ember-testing-wait-hooks] Allows registration of additional functions that the `wait` testing helper will call to determine if it's ready to continue.
* [FEATURE propertyBraceExpansion] Add simple brace expansion for dependent keys and watched properties specified declaratively.  This is primarily useful with reduce computed properties, for specifying dependencies on multiple item properties of a dependent array, as with `Ember.computed.sort('items.@each.{propertyA,propertyB}', userSortFn)`.
* [BUGFIX release] Update to Handlebars 1.1.2.
* [BUGFIX] Register a default RSVP error handler.
* Update to latest RSVP (80cec268).
* [BUGFIX] Ember.Object.create now takes `undefined` as an argument.
* Components are lazily looked up.
* Renaming everyBy and anyBy to isEvery and isAny.

###Ember 1.2.1 _(January 14, 2014)_

* [SECURITY] Ensure primitive value contexts are escaped.
* [SECURITY] Ensure {{group}} helper escapes properly.

###Ember 1.2.0 _(November 22, 2013)_

* [BUGFIX] Publish ember-handlebars-compiler along with builds.
* [BUGFIX] Use RegExp.test() for Ember.computed.match.
* [BUGFIX] {{partial}} helper now works with bound params
* [BUGFIX] Added assert mismatched template compiler version.
* [BUGFIX] Allow Ember.Object.create to accept an Ember.Object.
* [BUGFIX] Allow keyboard events to work with the action helper.
* [BUGFIX] Enumerable#any no longer returns false if NaN is matched - Fixes #3736
* [BUGFIX] PromiseProxy should merely observe promises. - Fixes #3714
* [BUGFIX] Fix issue with templateName in Route and render. - Fixes #3502
* [BUGFIX] Sort guid fallback unconfused by ObjectProxy.
* [BUGFIX] The router should cleanup itself upon destroy.
* Correct `Em.typeOf` docs re: boxed types.
* Update for Handlebars 1.1
* Allow test helpers to be injected on specific object.
* Update router.js
* [BUGFIX] Give precedence to routes with more static segments. Fixes #3573
* [BUGFIX] Improve unhandled action error messages
* [BUGFIX] Bubble `loading` action above pivot route
* [BUGFIX] reduceComputed ignore changes during reset.
* [BUGFIX] reduceComputed handle out-of-range index.
* [FEATURE] Add support for nested loading/error substates. A loading substate will be entered when a slow-to-resolve promise is returned from one of the Route#model hooks during a transition and an appropriately-named loading template/route can be found.  An error substate will be entered when one of the Route#model hooks returns a rejecting promise and an appropriately-named error template/route can be found.
* [FEATURE] Components and helpers registered on the container can be rendered in templates via their dasherized names. E.g. {{helper-name}} or {{component-name}}
* [FEATURE] Add a `didTransition` hook to the router.
* [FEATURE] Add a non-block form link-to helper. E.g {{link-to "About us" "about"}} will have "About us" as link text and will transition to the "about" route. Everything works as with the block form link-to.
* [FEATURE] Add sortBy using Ember.compare to the Enumerable mixin
* [FEATURE reduceComputedSelf] reduceComputed dependent keys may refer to @this.
* [BUGFIX] reduceComputed handle out of range indexes.
* Update Ember.immediateObserver and Ember.beforeObserver to match the new Ember.observer style.
* Make Ember.observer work with the function as the last argument.
* Ember.run.debounce and throttle accept string numbers like time interval
* Use Ember.Error consistently.
* Add assertion upon too many ajaxStop's.
* Introduce registerAsyncHelper which allows for unchained async helpers
* Ember-testing should not cause a test failure when aborting transitions
* Ember.Test Helpers no longer need to be chained
* Refactored promises usage
* Should not reference global `Handlebars` object, use `Ember.Handlebars` instead
* Added support for jQuery as a `require` module
* Decamelize handles strings with numbers
* disallow container registration if the corresponding singleton lookup has already occurred
* collection view will now defer all normalization to the resolver
* Remove Route#redirect soft deprecation
* Universalize {{view}} helper quoteless binding syntax, prevent id binding
* prefer Ember.Logger.assert over Logger error + setTimeout throw.
* Allow for the initial router to be resolved.
* Don't allow registration of undefined factories.
* Add `Ember.Subarray.prototype.toString`.
* [Improved assert for #3457] provide helpful assertion if needs is specified but no container is present.
* Update router.js to bc22bb4d59e48d187f8d60db6553d9e157f06789
* Update route recognizer
* Allow apps with custom jquery builds to exclude the event-alias module
* Removes long-deprecated getPath/setPath

###Ember 1.1.3 _(January 13, 2014)_

* [SECURITY] Ensure primitive value contexts are escaped.
* [SECURITY] Ensure {{group}} helper escapes properly.

###Ember 1.1.2 _(October 25, 2013)

* [BUGFIX] Fix failures in component rendering. - Fixes #3637

###Ember 1.1.1 _(October 23, 2013)_

* [BUGFIX] Allow Ember.Object.create to accept an Ember.Object.

### Ember 1.1.0 _(October 21, 2013)_

* Make Ember.run.later more flexible with arguments - Fixes #3072
* Add assertion upon too many ajaxStop's.
* [BUGFIX] Fix an issue with concatenatedProperties.
* [BUGFIX] Throw a sensible exception from SubArray.removeItem when not found.
* [BUGFIX] Fix evaluateUnboundHelper properties
* Use Ember.Error consistently.
* [BUGFIX] Make Component.sendAction behave the same as {{action}} helper.
* [BUGFIX] uniq reduceComputed dependent keys.
* Don't allow registration of undefined factories.
* Decamelize handles strings with numbers
* [BUGFIX] Allow a reduceComputed to have an undefined initialValue.
* [BUGFIX] Soft-deprecate mixed binding syntax in view helper
* Universalize {{view}} helper quoteless binding syntax, prevent id binding
* disallow container registration if the corresponding singleton lookup has already occurred
* [BUGFIX] Fix edge case in `TrackedArray`
* Remove Route#redirect soft deprecation
* [BUGFIX] link-to, bound helper issues with arrays of primitives
* [BUGFIX] Don't use incompatible array methods
* [BUGFIX] `Ember.Object.extend` should allow any prorerty
* [BUGFIX] Fix to return `undefined` for `href` of {{link-to}}
* [BUGFIX] `Ember.keys` should return own property
* [BUGFIX] Fixes #3332 - Array Computed Properties should update synchronously
* [BUGFIX] Fixes issue when content is undefined for Ember.Select with optgroup
* [BUGFIX] `Ember.SubArray` operation composition fix.
* [BUGFIX] Fire observers for array computed changes.
* [BUGFIX] Added tests failing for issue #3331
* Fix a bug in suspendListeners
* [BUGFIX] Optimization: Clear the meta cache without using observers.
* [BUGFIX] Calling `replaceIn` would incorrectly move views from the `hasElement` to `inDOM`
* [BUGFIX] ReduceComputedProperty ignore invalidated property observers.
* Set source object as context for callbacks in computed array property
* allow to inject falsy values like 'false' and 'null'
* `Ember.TargetActionSupport`'s `sendAction` should support `null` as context.
* Create Ember.libraries for keeping track of versions for debugging. emberjs/data#1051
* components should declare actions in the actions hash
* Close #3307 – Fix unexpected behavior with functions in concatenated properties
* Add shortcut for whitelisting all modifier keys on {{action}} Modifier key-independent action helper use cases can be less verbose and more future-proof.
* Only throw an initialValue error if it is null or undefined (i.e. not 0 or some other falsy value)
* Improve message and logic around UnrecognizedURLError
* Incorrect error message in router.js
* Install default error handler on ApplicationRoute#actions, not #events

### Ember 1.0.0 _(August 31, 2013)_

* Fix nested `{{yield}}`
* `ReduceComputed` groups changed properties.
* Multiple fixes and improvements to the new Array Computed Properties
* Adds the ability to specify view class for render
* Restructure controller init, to minimize property lookups
* Provide hook for persistence libraries to inject custom find behavior.
* Sync router.js
* Controller#controllers property should be readOnly
* Invalid Controller#controllers accesses throw runtime exceptions
* Inform about the Ember Inspector if not installed
* Don't force a layout on registered components
* Make TextField and TextArea components
* Adds Function.prototype.observesImmediately
* Move ember-states into a plugin: https://github.com/emberjs/ember-states
* Update Backburner
* Disabled model factory injections by default.
* Fix bug where link-to wouldn't be active even if resource is active
* Add Ember.PromiseProxyMixin
* Some fixes to grouped each
* Update to rsvp-2.0.2; fixes unit tests for RSVP#rethrow in IE 6,7,8
* Rename computed array macros to match #3158
* Consider `controllerName` in Ember.Route#render()
* Allow a template explicitly set on a view to be used when rendering a route.


### Ember 1.0.0-rc.8 _(August 28, 2013)_

* View, controller & route action handlers are now expected to be defined on an `actions` object.
* registerBoundHelper won't treat quoted strings / numbers as paths
* Array Computed Properties
* Rename bindAttr to bind-attr.
* Rename linkTo to link-to.
* Improved default route.serialize behavior. It will now attempt to populate named properties with the corresponding property on the model.
* Added Ember.getProperties
* Smarter linkTo observers
* Fix `Ember.EnumerableUtils#replace` to allow large size of array
* rsvp.js refresh with RSVP#rethrow and promise#fail
* Make sets during init behave the same as create(props)
* Continue to make view creation container aware
* Sync router.js - Closes #3153, #3180
* Application#resolver -> Application#Resolver
* The resolver now provides the normalization
* Add currentRouteName to ApplicationController
* Lookup itemViewClass and emptyView of collectionView if given as string
* Change behavior around uncached computed properties.
* Aliased xProperty methods in enumerable to xBy and aliased some and someProperty to any and anyBy respectively
* Factory Injections
* Support replaceURL on HashLocation
* Assorted performance improvements
* Add Ember.on, Function.prototype.on, init event
* Fix some `{{yield}}` bugs
* Improved `Route#controllerFor` to support `controllerName` and non-route lookups


### Ember 1.0.0-rc.7 _(August 14, 2013)_

* correctly preserve a views container
* Reference to RSVP repo for documentation
* Remove obsolete paragraph from ObjectController comments
* Add rel attribute binding to linkTo helper
* Add Ember.DataAdapter in ember-extension-support
* Asserts that a target element is in the DOM on `appendTo` and `replaceIn`.
* add Ember.create unit test, preventing parent object's pollute
* Sync with router.js
* fix #3094
* View event handlers inside eventManager should be wrapped in run loop
* fix #3093
* Handlebars template properties should not be methods
* Add assert that `this` is correct in deferReadiness and advanceReadiness. @stefanpenner / @lukemelia
* Remove `previousObject` argument from `Ember.Enumerable#nextObject`
* Remove `context` argument from `Ember.Enumerable#nextObject`
* Fixed some docs for Ember.Route
* Added the ability to send a context with actions in components
* Fixed a typo in documentation for {{log}}
* Added `mergedProperties` to ember-metal, Ember.Route's `events`
* render helper: falsy contexts no longer treated as absent
* Fix yield helper to only be craycray for components
* Components should not be singleton (just like views)
* Make methods on the router overridable. Denote private methods with _
* router.js sync - don't overwrite URL's on noop transitions
* adding docs for observers
* Clearer messaging for  changes and removal of bad assert
* Removed old-router
* Clarified Ember.warn message for linkTo loading state
* linkTo param of 0 should be treated as a url param
* Aborts/redirects in willTransition don't enter LoadingRoute
* Assertion if incrementProperty given non-numeric value
* Add sendAction() to Ember.Component
* {{yield}} view should be virtual
* Remove warning about route rendering that was inaccurate and confusing
* Fix {{template}} deprecation warnings in tests
* Ember.controllerFor and Route#controllerFor no longer generate controllers
* improve readability of some exceptions caught b
* update release rakefile to work with the updated website
* Clean up Handlebars helpers registered in tests
* Better route assertions - Fixes #2003
* Mixins don't technically extend Ember.Mixin
* Docs and whitespace cleanup
* Re-add Ember.Object.create docs and document createWithMixins
* Revert "document the create method in for subclasses of Ember.Object"
* router.js sync - simplified transition promise chain
* Added a License to the gemspec - Fixes #3050
* Only use valueNormalizer if one is present insideGroup. Fixes #2809
* Remove unnecessary assertion for `Ember.inspect`
* Fixed problem with dependentKeys on registerBoundHelper.
* Should allow numbers in tagNames i.e. h1-6
* [CVE-2013-4170] Fix for Potential XSS Exploit When Binding to User-Supplied Data
* Update component_registration_test.js to use component vs. control
* Fix test to normalize URL for IE7
* Fix date assertion that returned by `Ember.inspect`
* fix tests, isolate keywords in component, yield back controller and keywords in addition to context
* Add some more tests to stress-test yield
* Make yielded content look at the original context
* Don't set context in Ember.controllerFor
* Tweak htmlSafe docs
* Improve error message for missing itemView
* Improve assertion for non-Array passed to #each
* Add Example for Ember.computed.alias
* Remove unreferenced property `Ember.Comparable#isComparable`
* Remove unused argument for `Ember.Array#objectAt`
* Fix indeterminate checkbox that is set on insert
* Add jQuery 1.9 to testing rake task
* Support object with `Ember.String.fmt`
* Add 'date', 'regexp' and 'error' supprot to `Ember.inspect`
* Improve `Ember.inspect` for array
* Fix replacement for `Ember.String.fmt` to be parsed as decimal digit
* Upgrade to latest router.js
* {{input}} helper doesn't override default type
* Deprecate `template` in favor of `partial`
* Document htmlSafe
* upgrade RSVP
* Expose `options` arg in `debugger` HB helper
* Use the original arg length of wrapped CP funcs, still call the wrapper
* Documentation for sendEvent and doc change in removeListeners
* Fixed incorrect example of multi-arg registerBoundHelper
* Support indeterminate property in checkboxes
* Fix: didInsertElement was fired twice
* upload prod builds to s3
* Application#setupForTesting should set `Ember.testing = true`
* remove un-needed context preservation
* Don't push childViews if undefined/invalid (issue #2967)
* keyEvent integration test helper to simulate keydown, keypress etc.
* Add documentation to cover the `{{each}}` helper's `emptyViewClass` option.
* Removes an unused Ember.get include
* Improve Ember.Logger setup - Fixes #2962
* Better documentation for Ember.run.throttle and debounce
* Update Backburner.js
* View helper learns about the container
* Fix the jQuery patch code for ember-testing click in Firefox.
* update ember-dev to give proper assertion test failures
* [fixes #2947] container#unregister
* Validate fullNames on resolve
* Route#model by default now uses lookupFactory
* add resolveModel to the default resolver
* fix deprecation warning
* ember-application test refactoring
* Specify controller of a route via controllerName
* Remove non ASCII character in handlebars assertion error message
* .jshintrc: set browser:false
* Throw exception on invalid arguments for pushObjects method (issue #2848)
* {{linkTo}} bound contexts, loading class
* Use released handlebars
* Fixed bug in Ember.Application#reset that calls `startRouting` twice.
* assert that item view exists in container and camelize lookup name
* Remove property for compatibility
* Created helpful error message when using @each on an array that does not return objects
* Update Router.js: slashless handleURL, numeric/string params
* Allows itemView option into the each/collection helper. If itemView exists and there is a controller container, then it will attempt to resolve the view via the container.
* Add Ember.Route#disconnectOutlet, to allow for clearing a previously rendered outlet. Fixes #2002
* remove duplication of testing for Ember.run.debounce
* Update supported ruby version
* Updated JSBin And JSFiddle links to point to working fiddle/bin
* Document the container
* Use Ember.isNone instead of Ember.none
* Quoteless route param in linkTo performs lookup
* Allow value of TextField to be 0
* Fire mousedown & mouseup on clicks, plus focus for text fields.
* Add a check for jQuery versions with a specific checkbox click bug.
* warns when trying to get a falsy property
* Updating new Ember.Component documentation to remove confusion
* Stringify linkTo examples
* Update router.js. Fixes #2897.
* Added functionality to Router.map to allow it to be called multiple times without the map being overwritten. Allows routes to be added at runtime. One test with multiple cases also added.
* Revert "Use Ember setter to set Ember.Route controller."
* Calling router.map now appends the routes instead of replacing them
* simplify history.state support check
* Polyfill history.state for non-supporting browsers
* Switch from unbind to off for router location events
* Support grouping option for Ember.Select using optgroup
* Update Handlebars version to 1.0.0
* Show `beforeModel` and `afterModel` in API Route docs
* update lock file
* Add tests for #1866 - loc helper
* add loc helper
* document  ember-testing helpers


### Ember 1.0.0-rc.6 _(June 23, 2013)_

* Refactored `Ember.Route`s teardown mechanism for rendered views. This fixes #2857, previously multiple outlets were not tore down.
* Rename Control to Component. This avoids conflicts with the existing (behind-a-flag) control and is clearer about intent.
* Remove Ember.register to avoid introducing yet-another registration mechanism and move the logic into Ember.Handlebars.helper.
* Add test for parentViewDidChange event.
* Trigger parentViewDidChange event.[Fixes #2423]
* Make `control` helper more resilient.
* Ember.Select 0 can now be the selected value [Fixes #2763]
* Fix Ember.Select example.
* Ember.Control add inline docs.
* Add Ember.Control
* Make template loader an initializer
* Add lookupFactory
* Fix to support jQuery 1.7
* In mid-transition, `modelFor` accepts both camelCase and underscore naming
* In StateManager, use instanceof check instead of the legacy isState attribute. This is potentially breaking, but very unlikely to affect real-world code.
* StateManager and states now pass their `container` to child states.
* Ember.Test tests refactor
* Ember.Test fix wait helper resolution value
* Router facelift – Async transitions
* Ember.Test find helper no longer throws an error if the selector is not found.
* Additional API docs for LinkView
* [Fixes #2840] - textfield binding issue with null
* Update Backburner.js
* Make sure we are inside a run loop before syncing
* Inline helper function, remove uneeded function call.
* Remove unnecessary function call from `Ember.normalizeTuple`
* Ember.SortableMixin: new option sortFunction
* Update docs so that `Ember.View.$` is a method, not a property.
* Add documentation to cover LinkView's `eventName` property
* Improve docs for event names
* Remove expectAssertion in favor of ember-dev
* Added ability to change event type on which Ember.LinkView is triggered
* ContainerView#initializeViews learns about the container
* Improve Ember.View#createChildView container support
* Ensure assertion failures are test failures.
* Fix failing tests for non-blocking assertions
* Make the test suite work with non-blocking assertions
* Utilize the browser console.assert when possible
* Added custom test helper for testing assertions: expectAssertion
* Ember assertions work more like console.assert e.g. they are now uncatchable
* Update ember-dev
* Visit helper update router url before handling it
* Moved set of events to listen on by default to a property of EventDispatcher so it can be overridden
* Fix typo in array mixin docs
* Clarify subclasses of Ember.CoreView #2556
* Fix naming of _displayPropertyDidChange in comment
* Assert keyName not null and not undefined in get() and set()
* Add `debounce` to Ember.run. Uses `backburner.debounce`
* Cleaned up a bad check inside of `Ember.View._hasEquivalentView` that was causing routes with the same template and controller, but different view classes, not to render.
* Add documentation and test for Ember.Handlebars.helper
* Fix ember-dev s3 push.
* Fix App#reset to correctly reset even when Router.map was never called.
* Added test case that the render helper throws when a controller name doesn't resolve
* Release tooling improvements
* Adds assertion for misnamed controller name provided to render helper. [Fixes #2385]


### Ember 1.0.0-rc.5 _(June 01, 2013)_

* Added assertion for incorrect container lookup names
* adding docs for Ember.beforeObserver
* Remove ember-testing from production build
* Fixed bug with promises on startup. Fixes #2756.
* sync router.js fixes App#reset in ember-testing issue
* Notes that replaceWith only works with 'history' - Fixes #2744
* Fix failing tests in IE7 by normalizing URL
* Update backburner to fix IE8 failing test
* Update Backburner.js fixing the performance regression introduce in rc4
* maintain ruby'esq version string for gems
* remove starter_kit upload task (we just use the github tarbals)


### Ember 1.0.0-rc.4 _(May 27, 2013)_

* Loader: improve missing module error message
* Fix click test helper selector context
* fixes #2737: 'In the Router, if ApplicationController is an ObjectController, currentPath is proxied to the content.'
* Update backburner with autorun release
* use Ember.run.join internally for App#reset
* Add Ember.run.join
* Include 1.10 in jQuery version check
* Fix to ignore internal property in `Ember.keys`
* ensure willDestroy happens in action queue so live objects have a chance to respond to it before destroy
* Fix view leak (issue #2712)
* Added logging of view lookups
* App learns to LOG_ACTIVE_GENERATION
* Added support for calling multiple async test helpers concurrently
* fix misleading docs [fixes https://github.com/emberjs/website/issues/485]
* Added the ability to chain test helpers
* BREAKING: Move setting controller's `model` into setupController
* Updated ember-latest jsbin starting point URL
* Documentation for ComputedProperty cacheable
* Mask deprecation warning in metaPath testing
* mask deprecation warnings (when knowingly triggering them)
* Deprecate Ember.metaPath
* Treat {{#each}} as {{#each this}}
* Set actions as the default run loop queue
* Replace Ember.RunLoop with Backburner.js
* Deactivate route handlers before destroying container in App.reset() - Upgrade router.js micro-framework
* Create Test Adapter to keep ember-testing framework agnostic
* Simplify not-null-or-undefined checks
* [fixes #2697]
* update doc example to current router
* Ember.computed learns oneWay computed
* Find helper now throws when element not found and added selector context
* Fix downloads link for starter-kit
* Move /** @scope */ comments inline to their extend calls
* fixing JSON syntax error and upgrading ember-handlebars-compiler dependency to 1.0.0-rc.3
* Documentation: fix code block of Ember.String.capitalize
* Ember.Deferred now handles optional then handlers.
* upgrade ember-dev
* App#reset now only brings it's own run-loop if needed.
* gitignore bundler/* this allows for a local bundle --standalone
* Small corrections to Route.events documentation.
* Add assertion about setting the same current view to multiple container views
* Remove SC compatibility in Ember.Array
* Document and add assertion reflecting that helpers created with registerBoundHelper don't support invocation with Handlebars blocks.
* Trigger change in fillIn helper in ember testing
* Fix undefined error when promise rejected on startup
* Ember testing capture exceptions thrown in promises
* Rewrite `EMBER_VERSION` with `Ember::VERSION`
* Fix docs to use extend instead of create when setting observers
* Makes partial helper only lookup the deprecated template name if the first try is unsuccessful.
* Removed duplicate test for normalizeTuple
* Ember testing update url in visit helper
* bump RSVP (it now has RSVP.reject)
* Make parentController available from an itemController
* Stop unnecessary `jQuery.fn` extension
* Include `Ember::VERSION` in 'ember-source' gem
* Create Ember.Test with registerHelper method
* Improve {{render}} docs.
* Don't add disabled class if disabledWhen not provided
* More accurate, helpful error message for handlebars version errors.
* Adds disabledWhen option to {{linkTo}} helper
* Clean up pendingDisconnections propertly
* Make router's render idempotent
* Switch from bind to on for routing handlers.
* Switch from delegate/undelegate to on/off for EventDispatcher.
* Remove IE specified test
* Adding regression test
* Remove unused helper function
* This function is already defined as `set`
* Deferred self rejection does not need special handling
* Fix rejecting a deferred with itself
* Fix CollectionView.arrayDidChange documentation
* ember-testing: Make wait a promise and a helper
* tests on chained helpers added ember-testing for running in qunit
* Added `routeTo` for event-based transitions
* Prevent unnecessary re-rendering when only route context has changed
* Add test for visit helper in ember testing
* Reduce the polling interval to make tests run much faster
* Update route-recognizer - Fixes #2559
* Revert "Use isNone to check tag name"
* Support for redirection from ApplicationRoute
* Improving Ember.Select's null-content regresion test
* Prevent another exception on empty Ember.Select.content
* prevent exception on empty Em.Select content
* deprecate the defaultContainer (see: http://git.io/EKPpnA)
* RSVP is now promise/a+ 1.1 compliant
* Fix test for setTimeout with negative wait for older IE
* Use `Function.prototype.apply` to call `setTimeout` on older IE
* Use Ember.isNone
* Fixed view subclasses being instrumented as render.render.*
* Fixes #2526 - Updates JsFiddle and JsBin links for rc.3
* Add tests to deferred mixin
* Allow missing whitespace for assertion fot html text
* Fix incrementProperty/decrementProperty to be able to use with 0
* RSVP2
* Adds the ability to specify the view class used by the outlet Handlebars helper
* Make view helpers work with bindings
* get of property in false values should return undefined
* Really normalize hash params this time
* Normalize Ember.Handlebars.helper hashes
* Fix bug with Ember.Handlebars.helper
* Ember.EventDispatcher is now container managed.
* typeInjection's public api is via injection
* App#reset now triggers a eventDispatcher teardown
* Added docs of ArrayContentDidChange for array
* Move linkTo docs to helper instead of LinkView
* Use tag name supported by html 4
* Fix to use `Ember.ArrayPolyfills.forEach`
* Switch assertion for simulated Ember.create
* document {{input}} and {{textarea}} helpers
* convert bools to flags so it is easier to add new ones
* Fix to use `Ember.ArrayPolyfills.forEach` for IE8
* Skip Object.getOwnPropertyDescriptor only IE8
* Use stub `Object.create` for IE8
* Force downcase tag name for IE8
* rake release:gem + some cleanup
* Reduce late time to less than resolution capability of `setTimeout`
* Kepp timers order
* Adjust wait time to tick next run loop for more browsers
* additional Controller#needs documentation
* make use of Ember.isNone explicit in Ember.isEmpty
* Added API docs for 'needs' property of controller
* Use isNone to check tag name
* Added length property to Ember.Map


### Ember 1.0.0-rc.3 _(April 19, 2013)_

* fn.call is wasteful when the thisArg is not needed.
* dont needlessly close-over and rebuild insertViewCollection
* Don't apply href to LinkView that isn't using 'a' tag
* Documents {{linkTo}}
* Include ember-testing in full build
* Use `jQuery.is(':disabled')` instead of `jQuery(':disbled').length` for Opera
* Remove assigned but unused variable
* Document run.scheduleOnce, truncate run.once docs. Fixes #2132.
* fix failing tests for outerHTML fallback
* don't rely on EXTEND_PROTOTYPES == true
* Fixes Ember.EnumerableUtils without extend prototypes
* Do not flag .generateController for documentation.
* Do not build the docs for `.cacheable`. Fixes #2329.
* cleanup MutableEnumerable documentation
* Add Ember.Application#removeTestHelpers
* Fix a couple issues
* First pass of work for the ember-testing package
* Fixes error in documentation referring to non-existent 'Customizing Your Bindings' section
* Fix method comments
* Fix redirecting to child routes
* Fixes to MetamorphView's DOMManager replace
* Fixes #870 Lazy destruction + App#reset issues
* Eliminate unused variables
* Point to updated preconfigured starting points for JSFiddle/JSBin with latest Ember build that is now being auto-posted to builds.emberjs.com
* Fixes #2388: Added if statement to _resetSubControllers
* scope cached state transition hashes to the state manager class, so extending and mixins work with StateMangers as expected
* Fixes for upload of published builds.
* Update to latest ember-dev so that publish task can work properly
* Configure Travis for automatic deploy to AWS
* Add missing item type
* Do no emit Ember.alias deprecation warnings during alias tests
* add invokeRecursively to ViewCollection
* Failing test showing StateManagers using mixins to get some of their states have unexpected behavior
* Fix HistoryLocation rootURL handling and webkit workaround
* Remove unused argument from helper functions
* Use `toArray` to remove duplication
* Allow option view for Ember.Select overwritable
* Actually make Ember.alias() print deprecation warnings.
* use ``Ember.String.fmt`` instead of String extension
* automatically upload all passing builds to s3
* [Fixes #2424] App#reset
* s/nexts/these (nexts is not a word)
* More verbose error message on failed linkTo routing attempts
* viewName is a property
* remove uneeded closures
* JSDoc should use {*} for mixed types instead of {anything} and {any}
* add an "includeSelf" parameter to "invokeRecursively"
* Fix ArrayController#length when content is not explicitly set
* Close #2043 - fix issue with removing last element in collection
* Stop application template from duplicating on re-render
* assertion to catch mixins being passed to Object.create
* Enhance Ember.TargetActionSupport and introduce Ember.ViewTargetActionSupport
* fix {{textarea}} assert message
* Test for unwatch methods on object length property
* Tests for watch methods on length properties
* Test for isWatching on length property of an object
* Move Ember.typeOf to metal
* Fix array watching issue. Was affecting more than just plain arrays due to differences between typeOf and isArray.
* Remove mention of passing mixins to create.
* Revert "Fix Application#reset destroy issue"
* Fix view helper documentation and example to reflect context
* Ignore webkitStorageInfo during namespace lookup to avoid warning
* Fix Application#reset destroy issue
* Make Chrome initial popstate workaround account for rootURL
* Use a string instead of an array in RenderBuffer
* Convert a for in loop to a plain for loop
* Improve view container lookup performance
* remove uneeded asynchrony from Ember.Deferred tests
* remove unneeded asynchrony from routing tests
* Add {{text area}}
* Default text input action to 'enter'
* Add {{input action="foo" on="keyPress"}}
* More metal cleanup
* Better organize ember-metal and cache function lookups.
* remove sync from render to buffer
* make tests not depend on synchronous change events
* fix test not to expect synchronous observers
* Define Mixin properties in prototype
* Update ember-dev gem to latest version
* Share empty arrays in Ember.View prototype. Lazily slice it upon manipulation.
* Add views to Ember.View.views upon insertion in DOM rather than on init. Fixes #1553
* Make object destruction async so we can reduce churn when destroying interconnected object graphs.
* Define Ember.CoreObject#willDestroy. Fixes #1438.
* cleanup unneeded volatile()
* Match the transitionTo APIs.
* Avoid recursively calling transitionTo.
* Improve the performance of view notifications and transitions.
* Extract a private ViewCollection class to aid in manipulating several views at once.
* Add support for {{input type="checkbox"}}
* Add Ember.Handlebars.helper
* Add {{input type="text"}}
* Insert adjacent child views in batches rather than individually.


### Ember 1.0.0-rc.2 _(March 29, 2013)_

* Improved the App initialization process and deprecated Ember.Application#initialize. If you were using this, use deferReadiness and advanceReadiness instead.
* Added support for Ember.Application#then which fires similarly to the isReady hook
* Added more Ember.computed macros
* Added readOnly flag for computed properties
* Enumerable#compact now removes undefined values
* Fixed issue with unregistering actions on virtual views
* Make Ember.LinkView public
* Add support for jQuery 2.0
* Support browsers (FF 10 or less) that don't support domElement.outerHTML
* Made it easier to augment the Application's container's resolver
* Support tag as an alias for tagName in the {{view}} helper
* Add 'name' to attributeBinding for Ember.TextField and Ember.Select
* Return merged object from Ember.merge
* Deprecate setting tagNames on Metamorphs - Refs #2248
* Avoid parent's implicit index route clobbering child's explicit index.
* App#reset behaves more closely to App#create
* Make Evented#on, #off, and #one chainable
* Add basic implementation of allowedKeys for the {{action}} helper
* Improved Ember.Array#slice implementation
* Fix ArrayProxy arrangedObject handling - Fixes #2120, #2138
* Added ability to customize default generated controllers and routes
* Better HistoryLocation popstate handling - Fixes #2234
* Fix an issue with IE7
* Normalized Ember.run.later and Ember.run.next behavior.
* Fix issue where classNameBindings can try to update removed DOM element.
* Ember.Array methods always return Ember.Arrays
* RSVP is now exposed as Ember.RSVP
* ObjectProxy does not attempt to proxy unknown properties on create
* Can now set ENV.LOG_VERSION to false to disable version logging
* Ember.ArrayController#lastObject no longer raises when empty
* Fixes to {{render}} helper when used with model
* Improvements to {{linkTo}} controller handling
* Fix {{bindAttr}} when targeting prop in {{#each prop in array}} - #1523
* String#camelize lowercases the first letter
* Other miscellaneous bug fixes and documentation improvements


### Ember 1.0.0-rc.1 _(February 15, 2013)_

* Upgrade to Handlebars 1.0.0-rc.3
* Update RSVP.js
* Update router.js
* Support 0 values for input tags
* Support for jQuery 1.9
* ArrayController now defaults to empty array
* Added Vagrant support for setting up a development environment
* Adds {{each itemController="..."}}
* Fix issues where route transitions would not register properly
* Initial support for Application#reset
* Fix handling of keywords in bind helpers
* Better handling of DOM properties
* Better handling of complex {{#if}} targets
* {{linkTo}} shouldn't change view context
* Router#send accepts multiple params
* Provide a view's template name for debugging
* Create activate and deactivate hooks for router
* {{action}} targets are now looked up lazily
* The model for Route#render is now bound
* Improvements to ContainerView
* Added 'pattern' attribute to text field for iOS.
* CollectionView context is now its content
* Various enhancements to bound helpers: adds multiple property support to bound helpers, adds bind-able options hash properties, adds {{unbound}} helper support to render unbound form of helpers.
* Add App.inject
* Add Ember.EnumberableUtils.intersection
* Deprecate Controller#controllerFor in favour of Controller#needs
* Adds `bubbles` property to Ember.TextField
* Allow overriding of Ember.Router#handleURL
* Allow libraries loaded before Ember to tie into Ember load hooks
* Fixed behavior with Route#render and named outlets
* Fix bug where history location does not account for root URL
* Allow redirecting from mid-route
* Support string literals as param for {{linkTo}} and {{action}}
* Empty object proxies are no longer truthy in {{#if}}


### Ember 1.0.0-pre.4 _(January 17, 2013)_

* Add {{partial}}
* Fix regressions in router.js
* Support jQuery 1.9.0
* Use the controller with the same name as the template passed to render, if it exists


### Ember 1.0.0-pre.3 _(January 17, 2013)_

* BREAKING CHANGE: New Router API
* BREAKING CHANGE: `Ember.Object.create` behaves like `setProperties`. Use `createWithMixins` for the old behavior.
* BREAKING CHANGE: No longer default a view's context to itself
* BREAKING CHANGE: Remove the nearest view computed properties
* Significant performance improvements
* Bound handlebars helpers with `registerBoundHelper`
* Ember.String improvements
* TextSupport handles input, cut, and paste events
* Add `action` support to Ember.TextField
* Warn about using production builds in localhost
* Update Metamorph
* Deprecate Ember.alias in favour of Ember.aliasMethod
* Add Ember.computed.alias
* Allow chaining on DeferredMixin#then
* ArrayController learned itemControllerClass.
* Added VagrantFile and chef cookbooks to ease ember build for developers.
* Provide an Ember.Handlebars precompilation package
* Removed Tab controls
* Fix Chrome (pre v25) MutationObserver Memory Leak
* Update to Promises/A+ compatible RSVP
* Improved instrumentation
* Rename empty to isEmpty and none to isNone
* Added support for toStringExtension to augment toString
* Implement a default computed property setter.
* Add support for unhandledEvent to StateManager.
* Load external dependencies via an AMD shim
* Pass in the old value into the CP as a third argument
* Deep copy support for NativeArray
* Added an afterRender queue for scheduling code to run after the render queue has been drained
* Implement _super() for computed properties
* Miscellaneous bug fixes
* General cleanup


### Ember 1.0.0-pre.2 _(October 25, 2012)_

* Ember.SortableMixin: don't remove and reinsert items when their sort order doesn't change.  Fixes #1486.
* Fix edge cases with adding/removing observers
* Added 'disabled' attribute binding to Select
* Deprecate usage of {{collection}} without a class in favor of {{each}}
* Changing `Ember.Handlebars.getPath` to `Ember.Handlebars.get` for consistency. This addresses #1469.
* Since `$.uuid` was removed from jQuery master, we're switching to using `Ember.uuid` instead.
* Add Ember.View#nearestOfType, deprecate nearestInstanceOf
* Adds support for globbed routes
* Remove CP_DEFAULT_CACHEABLE flag
* Remove VIEW_PRESERVES_CONTEXT flag
* Replace willRerender with willClearRender
* Bumped jQuery requirement to 1.7.2+, explicitly forbidding 1.7 and 1.7.1 (see: #1448)
* Add Ember.String.classify() to string extensions
* HistoryLocation now utilizes history.replaceState
* Add a basic instrumentation API
* Allow extension of chosen prototypes instead of the current all or none.
* Remove dependency on `window` throughout Ember
* Don't attempt to concat a concatenatedProperty onto an object that doesn't have a concat method
* Remove ember-views dependency from ember-states
* Multiselect updates array content in place.
* Support applications without a router
* Add Ember.Deferred mixin which implements promises using RSVP.js
* Fix for popstate firing on page load.
* Fixed bug in CP setter where observers could be suspended and never restored.
* Fixed a bug with setting computed properties that modify the passed in value.
* Initial work to allow operation with handlebars runtime only
* A listener registered with one can be removed with off
* Calling removeListener without method should remove all listeners
* Add autoinit flag to Application to call initialize on DOM ready.
* Create view for application template if no ApplicationView.
* Remove support for inline anonymous templates.
* Rename createRouter to setupRouter to make clear.
* Extract createRouter from Application#initialize
* Extract runInjections from Application#initialize
* Simplify syntax so we can extract more easily
* Extract createEventDispatcher from Application#init
* Update for Handlebars 1.0.rc.1
* Fix State.transitionTo to handle multiple contexts
* Cleanup classNameBindings on remove
* Support defining injections to occur after other injections
* Computed prop setter improvements
* fix :: syntax in classNameBindings to work with falsy values
* Fix Ember.Error properties
* Improved error handling with Ember.onerror
* Adds currentPath to Ember.StateManager
* Provide default args to tryInvoke - fixes #1327
* Fix a bug in multi-selects with primitive options
* Fix formatURL to use rootURL and remove formatPath
* Fixing Ember.Router.route when rootURL is used
* ContainerViews should invalidate `element` on children when rendering.
* Add test for selecting in multi selects with prompts
* Fix: Passing a regex to split in IE8 returns a single item array, causing class names beginning with a colon to fail to render in IE8.
* Adding itemViewClass attribute to the each helper.
* Reorganize load hooks to be more sane
* Improve application readiness framework
* Small restructuring of ArrayProxy
* Add #setObjects to mutable array. A helper for replacing whole content of the array with a new one.
* Fixed selecting items in ember multi-selects
* Add disconnectOutlet method to controller
* The content property of an ArrayProxy instance should be defined before modifying it
* Adds a has() method to Ember.OrderedSet
* Adds hooks for suspending observers
* Check that a controller inherits from Ember.Object before instantiating it to the router.
* Support jQuery 1.8 - fixes #1267
* Ember.empty returns true if empty Ember.ArrayProxy
* add scheduleOnce and remove flag
* add various lifecycle tests to check updated ContainerView path. Expose problem with flag for scheduling one time.
* Moving location tests to routing package
* Make outlet a Metamorph view
* Tests showing problem with adding and replacing
* refactor ContainerView children rendering to not make assumptions at scheduling time, just at render time.
* Remove remaining references to viewstates
* Select element should initialize with the correct selectedIndex when using valueBinding
* Remove deprecated Ember.ViewState.
* Handle undefined element in bindAttr and classNameBindings
* Render now uses context instead of _context
* Better version replacement regexp
* Outlets reference context instead of controller.
* Rakefile :clean remove 'tmp' folder
* Performance improvements


### Ember 1.0.pre _(August 03, 2012)_

* Return undefined instead of empty jQuery object for Ember.View#$ when not in DOM
* Adds didDefineProperty hook
* Implement immediateObserver placeholder in preparation for making observers asynchronous
* Change {{action}} API for more explicit contexts
* Add connectControllers convenience
* Assert that transitionTo at least matched a state
* Delay routing while contexts are loading
* Also rename trySetPath to trySet
* Replaced getPath/setPath with get/set
* Remove LEGACY_HANDLEBARS_TAG flag
* Add two new core methods to allow invoking possibly unknown methods on objects
* Change ternary syntax to double colon sytax
* Add tests for ternary operator in class bindings
* Test for defined Router lacking App(View|Controller)
* Allow alternate clicks for href handling - Fixes #1096
* Respect initialState when transitioning to parent of current state - Fixes #1144
* add reverseObjects
* Fixing rootURL when path is empty
* HistoryLocation appends paths to router rootURL
* Make Ember.Logger support the 'info' and 'debug' methods on fallback (for IE8).
* Support currentView on init if ContainerView is created with one
* {{bindAttr class="this"}} now works; fixes #810
* Allow connectOutlet(outletName, name, context) syntax
* turn on mandatory setter for ember-debug if not set
* Change the default setUnknownProperty to define it before setting.
* {{view}} now evaluates the context of class bindings using the same rules applied to other bindings
* dataTransfer property for drag and drop events
* require jQuery 1.7, no longer accept 1.6
* add mandatory setter assertion
* Add date comparison to Ember.compare
* We use jquery event handling for hashchange/popstate
* Deprecate Ember.Tabs - Fixes #409
* Remove data-tag-name "feature" from <script> tags
* Only register Ember.View.views for non virtual views
* Add support for tabindex in Ember Controls.
* Only push new history when initialURL has changed
* Support basic States inside of Routes
* Refactor context handling for States and Routes
* Make Map copyable
* Assert that path passed to urlFor is valid
* Do not run functions passed to Ember.assert, Ember.warn, and Ember.deprecate
* Allowing developer to turn off verbose stacktrace in deprecation warnings
* Ember.Route.serialize must return a hash
* lazy setup of ComputedProperties
* change convention from var m = meta(obj) to var meta = metaFor(obj)
* add hook for desc for willWatch and didUnwatch
* Call transitionEvent for each nested state - Fixes #977
* Define a 'store' property in ControllerMixin, to avoid proxy-like handling at router initialization (controllers store injection).
* if there is no context, allow for views without controllers
* Add MapWithDefault
* serialize route states recursively
* urlForEvent for a route with a dynamic part doesn't serialize the context
* Don't stopPropagation on action handling by default
* Implement a route's navigateAway event
* Change app.stateManager to app.router
* Allow a one-time event listener on Ember.Evented
* Rename `fire` to `trigger`
* change sendEvent signature from sendEvent(obj, name, …) to sendEvent(obj, name, params) to avoid copying the arguments. Conflicts:
* Deprecate Ember.ViewState
* remove Ember.MixinDelegate
* Call preventDefault on events handled through {{action}}
* Call transitionEvent on initialStates as well as targeted state
* During apply not applyPartial, chains maybe setup, this makes sure they are updated.
* allow computed properties to be overridden
* Change connectOutlet API to prefer Strings
* Fix bug with Ember.Router#route not reflecting redirections in location
* Give Ember.Select prompt an empty value
* Create Ember.ArrayPolyfills
* Rename ArrayUtils to EnumerableUtils
* Use transitionTo rather than goToState
* Improve ArrayUtils by removing unnecessary slices
* Use evented system for dom events on views
* Fix switchToUnwatched so ObjectProxy tests pass.
* Skip mixin properties with undefined values
* Make defineProperty override native properties
* Fix unsupported method errors in older browsers
* Improved Ember.create shim
* Can't use lib/ember.js because we use that for precompiling, so let's use dist/distold instead
* Use `getPath` instead of `get` in computed macros in order to allow 'foo.bar' dependencies
* A route's `serialize` should handle null contexts
* Router.location cannot be null or undefined
* Use 'hash' as default location implementation on Router
* Clean up location stubbing in routable_test
* Instantiate Ember.Location implementation from Router
* Add NoneLocation
* Add options hash syntax to connectOutlet.
* Added 'ember-select' CSS class to Ember.Select, as per the convention with other included views.
* Fix Ember.setPath when used on Ember.Namespaces
* Remove async transitions.
* Enumerate all properties per injection.
* Injections can specify the order they are run.
* Make sortable test deterministic
* Improve invalidation of view's controller prop
* Cleaning up in history location
* Removing lastSetURL from setURL
* Fix bug with computed properties setters not triggering observers when called with a previous value
* Fix failing test
* Adding popstate tests for history based location
* Splitting location implementations from Location
* Use accessors for eventTransitions
* Finish implementation of Sortable mixin
* Move sorting into separate mixin
* Crude sorting on ArrayController
* Split ArrayProxy into content and arrangedContent
* Fix broken upload_latest task by specifying version for github_api
* Add some convenience computed property macros to replace the major usages of binding transforms
* Initial pushState based location implementation
* Support #each foo in this and #with this as bar
* `collection` should take emptyViewClass as string
* Don't update the route if we're routing
* Don't special-case the top-level '/'
* Make routing unwind properly
* Replace occurrences of goToState with transitionTo.
* No longer support RunLoop instantiation without `new`.
* Improve naming and code style
* Guard mergeMixins parameters more generally
* Guard against implicit function application by Ember.assert
* Use Ember.assert instead of throw
* Guard against undefined mixins
* Remove unused local variables
* Update gems
* Enable selection by value in Ember.Select.
* Update build URL
* Fix issue with Ember.Select when reselecting the prompt
* Call setupStateManager in initialize, not in didBecomeReady
* Let ES5 browsers actually work
* Lookup event transitions recursively in the ancestor states.
* Support global paths in the with/as helper. Fixes #874
* Views should inherit controllers from their parent
* Semi-hackish memory management for Ember.Application
* Transition to root to enable the back-button
* Insert ApplicationView by default
* Respect href parameter for {{action}}
* Allow setting `target` on `ObjectController`
* Remove deprecated functionality from get/set
* urlFor should raise an error when route property is not defined
* fix build by checking VIEW_PRESERVES_CONTEXT
* Only call formatURL if a location is defined
* URL generation takes into account location type
* Rename templateContext to context
* Change default template context to controller
* Removes deprecated label wrapping behavior and value property of Ember.Checkbox
* ControllerObject class can be initialized with target, controllers and view properties
* Add Ember.State.transitionTo
* Wire up {{action}} to emit URLs
* Use standard StateManager send/sendRecursively and convert state method arguments to include options hash when necessary.
* Correct state transition name to reflect StateMachine state nesting.
* Add urlFor to Router
* make transitionEvent on state manager configurable
* The router's initialState is `root`
* Add redirectsTo in routes
* Make identical assertion messages distinguishable
* Check that tests don't leave open RunLoops behind
* Better Handlebars log helper
* Disallow automatic creating of RunLoops during testing; Require manual Ember.run setup.
* ObjectController
* rename location `style` to `implementation` and add `registerImplementation` method to ease custom implementations
* some sugar for Router initialization
* Fix initialization with non routable stateManager
* bindAttr should work with global paths
* Unbundled Handlebars
* Add Ember.Controller and `connectOutlet`
* Initial implementation of outlets
* Implement modelType guessing.
* Add support for modelType in the router


### Ember 0.9.8.1 _(May 22, 2012)_

* Fix bindAttr with global paths
* Fix initialization with non routable stateManager
* Better jQuery warning message
* Documentation fixes


### Ember 0.9.8 _(May 21, 2012)_

* Better docs
* Preliminary routing support
* Properly handle null content in Ember.Select - fixes #775
* Allow a context to be passed to the action helper
* Notify parentView of childView changes for virtual views
* Extract Ember.Application into a separate package
* Better console handling
* Removed warnings about element not being present in willInsertElement
* Removed old deprecated RunLoop syntax
* Add support for "input" event handlers
* Removed deprecated getPath/setPath global support, deprecated star paths
* Removed Ember.Set.create with enumerable
* Add Ember.Binding.registerTransform
* States should create a childStates array
* Always send Array#contentWillChange with contentDidChange
* Updated Metamorph - fixes #783
* Re-enable enumerable properties: [], firstObject and lastObject
* Add support for #each foo in bar
* Implement {{#with foo as bar}} syntax
* Fixed ordering of MutableArray#unshiftObjects
* Fix Em namespace in dev mode
* Add currentView property to Ember.ContainerView
* Namespace debugging functions, ember_assert, ember_deprecate, and ember_warn are now Ember.assert, Ember.deprecate, and Ember.warn.
* Rename BindableSpanView -> HandlebarsBoundView
* Updated Handlebars to 1.0.0.beta.6
* Ember.cacheFor should return falsy values
* Handlebars actions use a stateManager by default
* Bindings should connect to `this` and not the prototype.
* Fix security error w/ Opera and Frames - fixes #734
* Warn when attempting to appendTo or replaceIn with an existing Ember.View
* Change the context in which {{view}} renders
* Improve error when sending an unimplemented event
* Change didInsertElement function to event callback - fixes #740
* Precompile defaultTemplates for production builds
* Updated uglifier - fixes #733
* Improved the testing stack
* Using the colon syntax with classBinding should allow truthy values to propagate the associated class
* Add safeHtml method to String
* Improved compatibility with Handlebars.SafeString
* Deprecate Ember.Button - closes #436
* Refactor ember-states/view_states out into ember-viewstates so that states is free of ember-views dependency.
* Prevent classNames from being displayed twice
* Added ComputedProperty#volatile to turn off caching
* Support making Computed Properties cacheable by default


### Ember 0.9.7.1 _(April 19, 2012)_

* Better escaping method for RenderBuffer
* More rigorous XSS escaping from bindAttr


### Ember 0.9.7 _(April 18, 2012)_

* RenderBuffer now properly escapes attribute values. Fixes XSS vulnerability documented in #699.
* Make options an optional argument to Ember.Handlebars.getPath
* getProperties can be called with an array of property names
* Allow for jQuery prereleases and RCs - fixes #678
* Raise if both template and templateName appear
* DRY up createChildView initialization
* Ember.ContainerView should propagate template data
* allows yielded template blocks to be optional
* Fixed substate/parentState test
* Inline views should always have an id - Fixes #655
* Ember.View should not require view method sharing event name.
* Refactor and cleanup Ember.Checkbox
* Normalize keyword paths so that observers work
* Expose view and controller keywords to templates
* Ember.Select allows array selections when multiple=false.
* Ember.ArrayUtils.objectsAt returns correct objects.


### Ember 0.9.6 _(March 30, 2012)_

* Significant internal performance improvements
* Improved performance of RenderBuffer
* Avoid unneceesary ping-ponging in binding updates
* Fix infinite loop caused by jQuery.extend with array in older browsers
* Added ENV.SHIM_ES5 option to improve compatibility with Prototype.js
* Added Ember.Evented mixin for internal events
* Removed YES and NO constants
* No longer alias as SC/Sproutcore
* Deprecate lowercase Namespaces
* Improved "destroy" method and added "willDestroy" and "didDestroy" callbacks
* Support static classes in bindAttr
* Allow 'this' to be used in bindAttr
* Make sure States are exited in the proper order
* Deprecate re-rendering while view is inBuffer
* Add contextmenu event support
* {{action}} helper event includes view and context
* Simplified parameters passed by {{action}} helper to StateManager
* Allow the {{action}} helper to use "send" as the action name
* Collection itemViewClass itemHash bindings should be resolved in the proper context.
* Honor emptyViewClass attribute in collection view helper
* Allow View attributeBindings to be aliased.
* Add Ember.getWithDefault
* Add Ember.computed(key1, key2, func)
* Add Ember.Map
* Improvements to OrderedSet
* Warn if classNames or classNameBindings is set to non-array
* Warn when setting attributeBindings or classNameBindings with {{view}} helper
* Warn if user tries to change a view's elementId after creation
* Remove contained items from Ember.Set when calling #clear
* Treat classNameBindings the same as classBinding in the view helper
* Added maxlength to TextSupport; added size to TextField; added rows and cols to TextArea
* Fix bug where DOM did not update when Ember.Select content changed
* Dereference views from parent when viewName is specified and the view is destroyed
* Added "clear" method to Ember.MutableArray
* Added Ember.cacheFor to peek at computed property cache
* Added support for multiple attributes to Ember.Select
* Fix security warning in older Firefox
* Re-render views if the templateContext is changed
* More sugar for creating complex bindings
* Fixed bug where a class could not be reopened if an instance of it had already been created
* Enable unnamed Handlebars script tags to have a custom id with the `data-element-id` attribute
* Testing improvements including headless tests (rake test) and JSHint
* Improved framework build process
* API documentation improvements
* Added benchmarking harness for internals


### Ember 0.9.5 _(February 17, 2012)_

* Add Handlebars helper for {{yield}}
* Add a .jshintrc
* Add layout support to Ember.View
* Allow state managers to control their own logging
* Print more useful debug information in state manager
* Fix issues that prevented Ember from being used in iframes
* Fix path resolution for states
* State manager should raise if an event is unhandled
* Attribute Bindings should handle String objects - Fixes #497
* Fixed each/else - fixes #389
* Updated Metamorph - fixes #449
* States hashes misbehave when including classes
* The action helper should prevent default behavior on it's attached element
* Pass the event, view, and context to {{action}} helper actions
* #454 State Exit Methods Should Be Called In Reverse Order
* #454 test StateManager should send exit events in the correct order when changing to a top-level state
* Retrieve child views length after potential mutations
* Metamorph's replace now recursively invalidates childView elements
* Fixes a bug where parent views were not being set correctly when multiple views were added or removed from ContainerView
* Views removed from a container should clear rendered children.
* ContainerView should set parentView on new children
* Add state manager compatibility to action helper
* Adds ability to save metadata for computed properties
* Don't parse text/html by default. Use ENV.LEGACY_HANDLEBARS_TAG to restore this functionality. - Fixes #441
* Fix overzealous deprecation warnings
* Fix bug such that initialState *and* start states will be entered
* Miscellaneous documentation improvements
* Better framework warnings and deprecations


### Ember 0.9.4 _(January 23, 2012)_

* Add Ember.Select control
* Added Ember.Handlebars action helper to easily add event handling to DOM elements without requiring a new view
* jQuery 1.7 compatibility
* Added a runtime build target for usage with Node.js
* Instantiate a ViewState's view if it's not already an instance
* In addition to having a rootElement, state managers can now have a rootView property. If this is set, view states will append their view as a child view of that view.
* Views now register themselves with a controller if the viewController property is set
* Other miscellaneous improvements to States
* Allows setting a custom initial substate on states
* ContainerView now sets the parentView property of views that are added to its childViews array.
* Removed ember-handlebars-format, ember-datetime
* Array's [] property no longer notifies of changes. Use @each instead.
* Deprecated getPath/setPath global support
* Ember.Application's default rootElement has changed from document to document.body
* Events are no longer passed to views that are not in the DOM
* Miscellaneous improvements to Ember.Button
* Add return value to Ember.TargetActionSupport.triggerAction()
* Added Ember.Handlebars.precompile for template precompilation
* Fix security exceptions in older versions of Firefox
* Introduce Ember.onerror for improved error handling
* Make {{this}} work with numbers within an #each helper
* Textfield and textarea now bubble events by default
* Fixed issue where Handlebars helpers without arguments were interpreted as bindings
* Add callbacks for isVisible changes to Ember.View
* Fix unbound helper when used with {{this}}
* Add underscore and camelize to string prototype extensions.
* View tagName is now settable from Handlebars <script> template via data-tag-name
* Miscellaneous performance improvements
* Lots of minor bug fixes
* Inline documentation improvements


### Ember 0.9.3 _(December 19, 2011)_

* Make sure willInsertElement actually gets called on all child views. Element is still not guaranteed to work.
* Implement tab views and controller
* Fixed some parse errors and jslint warnings
* allow use of multiple {{bindAttr}}s per element


### Ember 0.9.2 _(December 16, 2011)_

* add replaceIn to replace an entire node's content with something new
* Use prepend() and after() methods of Metamorph
* Update Metamorph to include after() and prepend()
* Fixed some missing commas which prevented bpm from working
* Safer Runloop Unwinding
* Adding support for <script type="text/x-raw-handlebars">
* Remove parentView deprecation warning


### Ember 0.9.1 _(December 14, 2011)_

* Fix jslint warnings related to missing semicolons and variables defined twice
* Alias amber_assert to sc_assert for backwards compat
* Fix toString() for objects in the Ember namespace
* Clear rendered children *recursively* when removing a view from DOM.
* Manually assigns custom message provided new Ember.Error so it will appear in debugging tools.
* Add a currentView property to StateManager
* Duck type view states
* Add license file
* We don't need to support adding Array observers onto @each proxies, so don't bother notifying about them.
* Clean up some verbiage in watching.js
* Cleaned up the build script
* Fixed incorrect test
* Updated references to SproutCore to Ember
* Preserve old behavior for special '@each' keys.
* Making chained keys evaluate lazily and adding unit test
* Adding unit test to demonstrate issue #108.
