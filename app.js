const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const crypto = require("crypto");
const conn = require("./dbconnect").conn;
const lib = require("./lib");
const fileUpload = require('express-fileupload');
const fs = require("fs");
const session = require('express-session');
const schedule = require('node-schedule');

const serverConfig = require('./config/serverConfig');

const app = express();
const route = express.Router();

app.use(express.Router());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// setting for session
app.use(session({
    secret: serverConfig.sessionSecretKey,
    resave: true,
    saveUninitialized: true,
    cookie: { path: '/', httpOnly: true, secure: false, maxAge: null, expires: false }
}));


// 보안 상의 이유로 X-powered-by 헤더 없앰
app.disable('x-powered-by');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(fileUpload());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.static('public'));

const adminPath = require('./config/serverConfig').adminPath;
const index = require('./router/index.js');
const user = require('./router/user.js');
const challenge = require('./router/challenge.js');
const rank = require('./router/rank.js');
const admin = require('./router/admin.js');
app.use('/', index);
app.use('/user', user);
app.use('/challenge', challenge);
app.use('/rank', rank);
app.use(`/${adminPath}`, admin);


app.use( (req, res, next) => {
    res.render("404.pug", {url: req.url});
});


// Run the CTF server
const server = app.listen(serverConfig.port, () => {
    console.log("[*] nCTF Server started at port " + serverConfig.port);
});

// Do you want to use https?
// var server = require('greenlock-express').create({
//     version: 'v02',
//     configDir: '/etc/letsencrypt',
//     server: 'https://acme-v02.api.letsencrypt.org/directory',
//     email: 'rtlzeromemory@nate.com',
//     agreeTos: true,
//     approveDomains: [ 'h3x0r.kr' ],
//     app: app
// }).listen(80, 443);
