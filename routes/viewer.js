var express = require('express');
var router = express.Router();

/* GET viewing page. */
router.get('/', function(req, res, next) {
    res.render('viewer', { title: 'TRUNK' });
});

module.exports = router;