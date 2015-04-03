export default function(element) {
  var style = element.getAttribute('style');
  style = style.toUpperCase(); // IE8 keeps this is uppercase, so lets just upcase them all

  if (style !== '' && style.slice(-1) !== ';') {
    style += ';'; // IE8 drops the trailing so lets add it back
  }

  return style;
}
