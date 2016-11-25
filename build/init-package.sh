if [ -z "$1" ]
then
  echo "You must pass a package name as the first argument"
  exit 1
fi

ln -s ../../build/tsconfig.json "packages/$1/tsconfig.json"
mkdir "packages/$1/build"
ln -s ../../../build/tsconfig.modules.json "packages/$1/build/tsconfig.modules.json"
ln -s ../../../build/tsconfig.commonjs.json "packages/$1/build/tsconfig.commonjs.json"
ln -s ../../../build/build.js "packages/$1/build/build.js"