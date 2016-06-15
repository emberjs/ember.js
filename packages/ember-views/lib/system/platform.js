import { environment } from 'ember-environment';

// IE 6/7 have bugs around setting names on inputs during creation.
// From http://msdn.microsoft.com/en-us/library/ie/ms536389(v=vs.85).aspx:
// "To include the NAME attribute at run time on objects created with the createElement method, use the eTag."
export let canSetNameOnInputs = environment.hasDOM && (function() {
  let div = document.createElement('div');
  let el = document.createElement('input');

  el.setAttribute('name', 'foo');
  div.appendChild(el);

  return !!div.innerHTML.match('foo');
})();
