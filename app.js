const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const rateLimit = require("express-rate-limit");
const logger = require('morgan');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const serverConfig = require('./config/serverConfig');
const lib = require('./lib');
const app = express();

dotenv.config();


const setApplication = (app) => {
    app.use(express.Router());
  
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    
    app.use(cookieParser());

    const limiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minutes
        max: 60,
        message: "Calm down...",
    });
    app.use(limiter);

    app.use(logger({
        format: 'short',
        stream: fs.createWriteStream('./logs/app.log', {'flags': 'w'})
    }));

    app.use(session({
        secret: process.env.SECRET_KEY,
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

    const __admin_path__ = require('./config/serverConfig').adminPath;
    const index = require('./router/index.js');
    const user = require('./router/user.js');
    const challenge = require('./router/challenge.js');
    const rank = require('./router/rank.js');
    const admin = require('./router/admin.js');

    app.use(`/`, index);
    app.use(`/user`, user);
    app.use(`/rank`, rank);
    app.use(`/${__admin_path__}`, admin);
    app.use(`/challenge`, challenge);

    app.use( async (req, res) => {
	    res.status(404);
        res.render("404.pug", {url: req.url});
    });
};

setApplication(app);

const server = require('greenlock-express').create({
    version: 'v02',
    configDir: '/etc/letsencrypt',
    server: 'https://acme-v02.api.letsencrypt.org/directory',
    email: 'ch4n3.yoon@gmail.com',
    agreeTos: true,
    approveDomains: [ 'challenge.ch4n3.me' ],
    app: app
}).listen(80, 443);

