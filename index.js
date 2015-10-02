'use strict';

var path = require('path');

module.exports = {
  name: 'ember',
  blueprintsPath: function() {
    console.log('BRO');
    return path.join(__dirname, 'blueprints');
  }
};
