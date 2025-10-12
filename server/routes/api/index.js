const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const routeFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.js') && file !== 'index.js');

routeFiles.forEach((file) => {
  const modulePath = path.join(__dirname, file);
  const routeName = file.replace('.js', '');
  router.use(`/${routeName}`, require(modulePath));
});

module.exports = router;
