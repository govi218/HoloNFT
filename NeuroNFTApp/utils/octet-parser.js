function octet_parser(req, res, next) {
  if(req.body == undefined) {
    var buffer = []
    req.on('data', function onRequestData(chunk) {
      buffer.push(chunk)
    });

    req.once('end', function() {
      var concated = Buffer.concat(buffer);
      req.body = concated.toString('utf8'); // change it to meet your needs (gzip, json, etc)
      next()
    });
  } else {
    next();
    return;
  }
}
module.exports = octet_parser;
