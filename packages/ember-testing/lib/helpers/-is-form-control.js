const FORM_CONTROL_TAGS = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];

/**
  @private
  @param {Element} element the element to check
  @returns {boolean} `true` when the element is a form control, `false` otherwise
*/
export default function isFormControl(element) {
  let { tagName, type } = element;

  if (type === 'hidden') {
    return false;
  }

  return FORM_CONTROL_TAGS.indexOf(tagName) > -1;
}
