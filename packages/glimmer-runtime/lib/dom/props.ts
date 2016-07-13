/*
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
export function normalizeProperty(element, slotName) {
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

  if (type === 'prop' &&
      (normalized.toLowerCase() === 'style' ||
       preferAttr(element.tagName, normalized))) {
    type = 'attr';
  }

  return { normalized, type };
}

export function normalizePropertyValue(value) {
  if (value === '') {
    return true;
  }

  return value;
}

// properties that MUST be set as attributes, due to:
// * browser bug
// * strange spec outlier
const ATTR_OVERRIDES = {

  // phantomjs < 2.0 lets you set it as a prop but won't reflect it
  // back to the attribute. button.getAttribute('type') === null
  BUTTON: { type: true, form: true },

  INPUT: {
    // Some version of IE (like IE9) actually throw an exception
    // if you set input.type = 'something-unknown'
    type: true,
    form: true,
    // Chrome 46.0.2464.0: 'autocorrect' in document.createElement('input') === false
    // Safari 8.0.7: 'autocorrect' in document.createElement('input') === false
    // Mobile Safari (iOS 8.4 simulator): 'autocorrect' in document.createElement('input') === true
    autocorrect: true
  },

  // element.form is actually a legitimate readOnly property, that is to be
  // mutated, but must be mutated by setAttribute...
  SELECT:   { form: true },
  OPTION:   { form: true },
  TEXTAREA: { form: true },
  LABEL:    { form: true },
  FIELDSET: { form: true },
  LEGEND:   { form: true },
  OBJECT:   { form: true }
};

function preferAttr(tagName, propName) {
  let tag = ATTR_OVERRIDES[tagName.toUpperCase()];
  return tag && tag[propName.toLowerCase()] || false;
}
