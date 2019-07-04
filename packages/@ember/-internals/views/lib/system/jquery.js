import { context } from '@ember/-internals/environment';
import { hasDOM } from '@ember/-internals/browser-environment';
import { ENV } from '@ember/-internals/environment';
import { JQUERY_INTEGRATION } from '@ember/deprecated-features';

let jQuery;
export let jQueryDisabled = !JQUERY_INTEGRATION || ENV._JQUERY_INTEGRATION === false;

if (JQUERY_INTEGRATION && hasDOM) {
  jQuery = context.imports.jQuery;

  if (!jQueryDisabled && jQuery) {
    if (jQuery.event.addProp) {
      jQuery.event.addProp('dataTransfer');
    } else {
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
      ['dragstart', 'drag', 'dragenter', 'dragleave', 'dragover', 'drop', 'dragend'].forEach(
        eventName => {
          jQuery.event.fixHooks[eventName] = {
            props: ['dataTransfer'],
          };
        }
      );
    }
  } else {
    jQueryDisabled = true;
  }
}

export default (jQueryDisabled ? undefined : jQuery);
