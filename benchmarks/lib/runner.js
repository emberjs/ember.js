/* jshint esnext:true */
/* globals $ */

import w from 'iframe-wrapper';
import { implementations } from 'config';

export function run() {
  $(document).ready(function() {
    var files = implementations.split(',');
    for (var i = 0, l = files.length; i < l; i++) {
      w.wrapper(files[i], files[i]);
    }
  });
}
