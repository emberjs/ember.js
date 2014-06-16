# Lodash

Replacing Ember's internal helper utilities with lodash's comparable functions.

## Utilities Checklist

[x] filter
[x] forEach
[x] indexOf
[x] isBoolean
[x] isEmpty
[x] isFunction
[x] isObject
[x] map
[x] merge

## Building

From project root...

    lodash modularize exports="es6" include=filter,forEach,indexOf,isBoolean,isEmpty,isFunction,isObject,map,merge -o ./packages/lodash/lib
    touch ./packages/lodash/lib/main.js
