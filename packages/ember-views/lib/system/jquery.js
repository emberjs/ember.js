import { context, environment } from 'ember-environment';

let jQuery;
export let jQueryDisabled = false;

if (environment.hasDOM) {
  jQuery = context.imports.jQuery;

  if (jQuery) {
    if (jQuery.event.addProp) {
      jQuery.event.addProp('dataTransfer');
    } else {
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
      [
        'dragstart',
        'drag',
        'dragenter',
        'dragleave',
        'dragover',
        'drop',
        'dragend'
      ].forEach(eventName => {
        jQuery.event.fixHooks[eventName] = {
          props: ['dataTransfer']
        };
      });
    }
  } else {
    jQueryDisabled = true;
  }
}

export default jQuery;
