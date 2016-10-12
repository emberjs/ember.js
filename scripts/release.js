var execSync = require('child_process').execSync;

execSync("ember build --environment production");
execSync("npm publish");
