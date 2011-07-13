#!/bin/sh

packages="handlebars sproutcore-metal sproutcore-runtime sproutcore-datetime sproutcore-indexset sproutcore-datastore sproutcore-views sproutcore-handlebars"

for package in $packages
do
    cd packages/${package}/lib

    # get all js files except those in the tests
    sourcefiles=`find . -name "*\.js" ! -path "*test*"`

    # for every source file in package/lib
    for sourcefile in ${sourcefiles}
    do
        # pull the files dependencies out of the require() statements
        dependencies=`sed -n "s/^.*require([\"']\([^\"']*\).*/\1/p" ${sourcefile} | tr "\\n" " "`

        relativepath=`echo $sourcefile | sed s:./::`
        relativepath=${relativepath%.js}

        # output all the dependencies to a file for tsort
        if [[ -z $dependencies ]] ; then
            echo "${package}/${relativepath} ${package}/${relativepath}" >> .tsort
        else
            for dependency in $dependencies
            do
                echo "${package}/${relativepath} ${dependency}" >> .tsort
            done
        fi

    done

    # topologically sort based on the dependencies
    ordered=`tsort .tsort | sed -n '1!G;h;$p'`

    # output the filenames in the correct order for our one-line build script, below
    for file in ${ordered}
    do
        filepath=`echo ${file} | sed s:${package}:${package}/lib:`
        echo packages/${filepath}.js >> ../../../.build
    done

    # cleanup
    rm .tsort
    cd ../../..
done

rm -f sproutcore2.js
cat .build | grep "^[A-Za-z0-9_/-]*.js$" | xargs -n 1 -P 1 ./export.sh | grep -x -v "require(.*);" > sproutcore2.js
rm -f .build