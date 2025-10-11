const express = require('express');

const router = express.Router();
    
router.get('/', async (req, res) => {
  res.jsonp("214124");
});

module.exports = router;
