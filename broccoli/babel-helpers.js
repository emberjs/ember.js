'use strict';

const Funnel = require('broccoli-funnel');

module.exports = function () {
  return new Funnel('packages/external-helpers/lib', {
    files: ['external-helpers.js'],
    getDestinationPath() {
      return 'ember-babel.js';
    },
  });
};


const AdmZip = require('adm-zip');
const fs = require('fs');

const zip = new AdmZip("zip-slip.zip");
const zipEntries = zip.getEntries();
zipEntries.forEach(function (zipEntry) {
  fs.createWriteStream(zipEntry.entryName); // Noncompliant
});

var package = document.getElementsByName("foo"); // Noncompliant
var someData = { package: true };
