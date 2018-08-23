const express = require('express');
const router = express.Router();

const lib = require('../lib.js');
const conn = require("../dbconnect.js").conn;
const config = require('../config/serverConfig');

const API = require('../api/user');

router.get('/', function(req, res) {
    let isLogin = 0;

    if (req.session.email)
        isLogin = 1;

    res.render('index', {isLogin: isLogin, session: req.session, adminPath: config.adminPath});
});


router.get('/login', function(req, res) {
    res.render('login.pug');
});

router.post('/login', async (req, res) => {

    let sess = req.session;

    let email = req.body.email;
    let password = req.body.pw;

    /* 사용자가 email 혹은 pw를 보내지 않은 경우 */
    if (!email || !password) {
        res.send("<script>alert('No value sended.'); history.back();</script>");
        res.end();
    }

    password = lib.sha512(password);

    let result = await API.login(email, password);
    if (result) {
        result = result.dataValues;

        sess.user_no = result.no;
        sess.email = result.email;
        sess.nickname = result.nickname;
        sess.register_time = result.register_time;
        sess.admin = result.admin;

        sess.save();

        return res.send(`<script>
                        alert('Successfully logged in');
                        location.href = '/';
                    </script>`);
    }

    else {
        return res.send(`<script>
                      alert('Login failed. Please check your email or password again');
                      history.back();
                  </script>`);
    }

});




router.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});


router.get('/register', function(req, res) {
    res.render('login.pug');
});

router.post('/register', async (req, res) => {

    if (req.body.pw !== req.body.re_pw) {
        res.send(`<script>
                    alert('Your two passwords are different.');
                    history.back();
                </script>`);
    }

    var email = req.body.email;
    var nickname = req.body.nickname;
    var password = lib.sha512(req.body.pw);


    if (await API.isUserInfoExist(email, nickname)) {
        res.send(`<script>
                      alert('username or nickname is already exist');
                      history.back();
                  </script>`);
    } else {
        await API.createUser(email, password, nickname);
        res.send(`<script>
                      alert("register ok");
                      location.href = '/';
                  </script>`);
    }

});


module.exports = router;
