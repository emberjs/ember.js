import { forEach } from "./array-utils";

// The HTML elements in this list are speced by
// http://www.w3.org/TR/html-markup/syntax.html#syntax-elements,
// and will be forced to close regardless of if they have a
// self-closing /> at the end.
var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
var voidMap = {};

forEach(voidTagNames.split(" "), function(tagName) {
  voidMap[tagName] = true;
});

export default voidMap;
