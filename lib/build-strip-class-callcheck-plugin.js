module.exports = () => {
  return [
    require.resolve('babel-plugin-filter-imports'),
    { imports: { 'ember-babel': ['_classCallCheck'] } },
  ];
};
