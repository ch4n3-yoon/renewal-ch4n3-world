var express = require("express");
const path = require("path");
var bodyParser = require('body-parser');
var crypto = require("crypto");
var conn = require("./dbconnect").conn;
var lib = require("./lib");
const fileUpload = require('express-fileupload');
const fs = require("fs");
const session = require('express-session');
const schedule = require('node-schedule');

const serverConfig = require('./config/serverConfig');

var app = express();
var route = express.Router();

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


const root = require('./router/root.js');
const user = require('./router/user.js');
const challenge = require('./router/challenge.js');
const rank = require('./router/rank.js');
const secretjuju = require('./router/admin.js');
app.use('/', root);
app.use('/user', user);
app.use('/challenge', challenge);
app.use('/rank', rank);
app.use('/secretjuju', secretjuju);



// 페이크용 관리자 페이지
route.get('/admin', function(req, res) {
    res.send("admin page? just guessing plz lol (grin)");
});


// Run the CTF server
var server = app.listen(serverConfig.port, () => {
    console.log("[*] H3X0R CTF Server Start at port " + serverConfig.port);
});

// 서버 SSL 적용해서 시작하는 부분
// var server = require('greenlock-express').create({
//     version: 'v02',
//     configDir: '/etc/letsencrypt',
//     server: 'https://acme-v02.api.letsencrypt.org/directory',
//     email: 'rtlzeromemory@nate.com',
//     agreeTos: true,
//     approveDomains: [ 'h3x0r.kr' ],
//     app: app
// }).listen(80, 443);
