#!/bin/sh

echo "(function(exports){"
cat $*
echo "})({});"