var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var viewerRouter = require('./routes/viewer');
var carrierUploadRouter = require('./routes/upload_carrier');
var uploadRouter = require('./routes/upload');
var contractRouter = require('./routes/get_contract');
var usersRouter = require('./routes/users');
var octet_parser = require('./utils/octet-parser')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// n.b. order matters here (prob just octet)
app.use(octet_parser);
app.use(express.json({limit: '5mb', extended: true}));
app.use(express.urlencoded({limit: '5mb', extended: true}));

app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/node_modules/bootstrap/dist'));

app.use('/', indexRouter);
app.use('/viewer', viewerRouter);
app.use('/upload_carrier', carrierUploadRouter);
app.use('/upload', uploadRouter);
app.use('/get_contract', contractRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    console.log(err);

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
