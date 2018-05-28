/* global Proxy */
import { deprecate } from '@ember/debug';
import { global } from 'ember-environment';
import { HAS_NATIVE_PROXY } from 'ember-utils';
import { DEBUG } from '@glimmer/env';

export default function addJQueryEventDeprecation(jqEvent) {
  if (!DEBUG || !HAS_NATIVE_PROXY) {
    return jqEvent;
  }

  let boundFunctions = new Map();

  // wrap the jQuery event in a Proxy to add the deprecation message for originalEvent, according to RFC#294
  // we need a native Proxy here, so we can make sure that the internal use of originalEvent in jQuery itself does
  // not trigger a deprecation
  return new Proxy(jqEvent, {
    get(target, name) {
      switch (name) {
        case 'originalEvent':
          deprecate(
            'Accessing jQuery.Event specific properties is deprecated. Either use the ember-jquery-legacy addon to normalize events to native events, or explicitly opt into jQuery integration using @ember/optional-features.',
            (EmberENV => {
              // this deprecation is intentionally checking `global.EmberENV` /
              // `global.ENV` so that we can ensure we _only_ deprecate in the
              // case where jQuery integration is enabled implicitly (e.g.
              // "defaulted" to enabled) as opposed to when the user explicitly
              // opts in to using jQuery
              if (typeof EmberENV !== 'object' || EmberENV === null) return false;

              return EmberENV._JQUERY_INTEGRATION === true;
            })(global.EmberENV || global.ENV),
            {
              id: 'ember-views.event-dispatcher.jquery-event',
              until: '4.0.0',
              url: 'https://emberjs.com/deprecations/v3.x#toc_jquery-event',
            }
          );
          return target[name];

        // provide an escape hatch for ember-jquery-legacy to access originalEvent without a deprecation
        case '__originalEvent':
          return target.originalEvent;

        default:
          if (typeof target[name] === 'function') {
            // cache functions for reuse
            if (!boundFunctions.has(name)) {
              // for jQuery.Event methods call them with `target` as the `this` context, so they will access
              // `originalEvent` from the original jQuery event, not our proxy, thus not trigger the deprecation
              boundFunctions.set(name, target[name].bind(target));
            }

            return boundFunctions.get(name);
          }
          // same for jQuery's getter functions for simple properties
          return target[name];
      }
    },
  });
}
