#!/bin/sh

packages="handlebars sproutcore-metal sproutcore-runtime sproutcore-datetime sproutcore-indexset sproutcore-datastore sproutcore-views sproutcore-handlebars"

for framework in $packages
do
    cd packages/${framework}/lib

    # get all js files except those in the tests
    subs=`find . -name "*\.js"   ! -path "*test*"`

    # for every file
    for sub in ${subs}
    do
        # pulled the files dependencies out of the sc_require statement
        deps=`sed -n "s/^.*require([\"']\([^\"']*\).*/\1/p" ${sub} | tr "\\n" " "`

        theFile=`echo $sub | sed s:./::`
        theFile=${theFile%.js}

        # set all the dependencies in a file
        if [[ -z $deps ]] ; then
            echo "${framework}/${theFile} ${framework}/${theFile}" >> .tsort
        else
            for dep in $deps
            do
                if [ ${theFile} != "mixins/inline_text_field" ] ; then
                    echo "${framework}/${theFile} ${dep}" >> .tsort
                fi
            done
        fi

    done

    ordered=`tsort .tsort | sed -n '1!G;h;$p'`

    for file in ${ordered}
    do
        filepath=`echo ${file} | sed s:${framework}:${framework}/lib:`
        echo packages/${filepath}.js >> ../../../.build
    done
    rm .tsort
    cd ../../..
done

rm -f sproutcore2.js
cat .build | grep "^[A-Za-z0-9_/-]*.js$" | xargs -n 1 -P 1 ./export.sh | grep -x -v "require(.*);" > sproutcore2.js
rm .build