const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const conn = require("./dbconnect").conn;
const fileUpload = require('express-fileupload');
const session = require('express-session');
const schedule = require('node-schedule');


const serverConfig = require('./config/serverConfig');
const app = express();

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


app.use( async (req, res) => {
    res.render("404.pug", {url: req.url});
});


if (serverConfig.isHttps) {

    const server = require('greenlock-express').create({
        version: 'v02',
        configDir: 'YOUR_DIR',
        server: 'https://acme-v02.api.letsencrypt.org/directory',
        email: 'YOUR_EMAIL',
        agreeTos: true,
        approveDomains: [ 'YOUR_DOMAIN' ],
        app: app
    }).listen(serverConfig.port, 443);

}

else {

    const server = app.listen(serverConfig.port, () => {
        console.log("[*] nCTF Server started at port " + serverConfig.port);
    });

}

