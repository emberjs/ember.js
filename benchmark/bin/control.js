// eslint-disable-next-line node/no-unpublished-require
const express = require('express');

const app = express();
app.use(
  '/',
  express.static(__dirname + '/../../dist/benchmarks/control', {
    lastModified: true,
    etag: true,
    cacheControl: true,
  })
);
app.listen(3000);
