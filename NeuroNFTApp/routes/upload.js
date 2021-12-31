var express = require('express');
var router = express.Router();

/* POST file upload. */
router.post('/', function(req, res, next) {
    console.log(req.body)

    // get image from req

    // make subprocess to pack encrypted blob

    // send it back as a download in res

    res.render('index', { title: 'Express' });
});

module.exports = router;
