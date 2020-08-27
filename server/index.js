module.exports = function (app) {
  app.get('/', function (req, res) {
    res.redirect('/tests/index.html?hidepassed');
  });

  app.get('/tests', function (req, res) {
    res.redirect('/tests/index.html');
  });
};
