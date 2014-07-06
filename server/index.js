module.exports = function(app) {
  app.use(require('express').static(__dirname + '/../'));
  app.get('/', function(req, res) {
    res.redirect('dist/tests/');
  })
};
