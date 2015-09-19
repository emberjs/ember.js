export function isAttrRemovalValue(value) {
  return value === null || value === undefined;
}
/*
 *
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
export function normalizeProperty(element, slotName) {
  var type, normalized;

  if (slotName in element) {
    normalized = slotName;
    type = 'prop';
  } else {
    var lower = slotName.toLowerCase();
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

// properties that MUST be set as attributes, due to:
// * browser bug
// * strange spec outlier
var ATTR_OVERRIDES = {

  // phantomjs < 2.0 lets you set it as a prop but won't reflect it
  // back to the attribute. button.getAttribute('type') === null
  BUTTON: { type: true, form: true },

  INPUT: {
    // TODO: remove when IE8 is droped
    // Some versions of IE (IE8) throw an exception when setting
    // `input.list = 'somestring'`:
    // https://github.com/emberjs/ember.js/issues/10908
    // https://github.com/emberjs/ember.js/issues/11364
    list: true,
    // Some version of IE (like IE9) actually throw an exception
    // if you set input.type = 'something-unknown'
    type: true,
    form: true
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
  var tag = ATTR_OVERRIDES[tagName.toUpperCase()];
  return tag && tag[propName.toLowerCase()] || false;
}
