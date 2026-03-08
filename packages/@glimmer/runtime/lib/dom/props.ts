import type { Dict, SimpleElement } from '@glimmer/interfaces';

/*
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
export function normalizeProperty(element: SimpleElement, slotName: string) {
  let type, normalized;

  if (slotName in element) {
    normalized = slotName;
    type = 'prop';
  } else {
    let lower = slotName.toLowerCase();
    if (lower in element) {
      type = 'prop';
      normalized = lower;
    } else {
      type = 'attr';
      normalized = slotName;
    }
  }

  if (
    type === 'prop' &&
    (normalized.toLowerCase() === 'style' || preferAttr(element.tagName, normalized))
  ) {
    type = 'attr';
  }

  return { normalized, type };
}

export function normalizePropertyValue(value: unknown): unknown {
  if (value === '') {
    return true;
  }

  return value;
}

// Properties that MUST be set as attributes because the DOM properties
// are read-only or have type mismatches with the HTML attributes.
//
// element.form is a read-only DOM property on all form-associated elements
// that returns the owning HTMLFormElement (or null). The HTML `form` attribute
// (set via setAttribute) associates the element with a form by ID.
// See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/form
//      https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/form
const ATTR_OVERRIDES: Dict<Dict> = {
  INPUT: {
    form: true,
    // HTMLElement.autocorrect is a boolean DOM property, but the HTML attribute
    // uses "on"/"off" strings. Setting `element.autocorrect = "off"` coerces to
    // `true` (truthy string). Must use setAttribute for correct "on"/"off" behavior.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/autocorrect
    autocorrect: true,
    // HTMLInputElement.list is a read-only DOM property that returns the associated
    // HTMLDataListElement (or null). Must use setAttribute to set the datalist ID.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/list
    list: true,
  },

  SELECT: { form: true },
  OPTION: { form: true },
  TEXTAREA: { form: true },
  LABEL: { form: true },
  FIELDSET: { form: true },
  LEGEND: { form: true },
  OBJECT: { form: true },
  OUTPUT: { form: true },
  BUTTON: { form: true },
};

function preferAttr(tagName: string, propName: string) {
  let tag = ATTR_OVERRIDES[tagName.toUpperCase()];
  return !!(tag && tag[propName.toLowerCase()]);
}
