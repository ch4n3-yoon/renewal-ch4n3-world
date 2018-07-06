var express = require('express');
var router = express.Router();

var lib = require('../lib.js');
var conn = require("../dbconnect.js").conn;

router.get('/', function(req, res) {
    var isLogin = 0;

    if (req.session.email)
        isLogin = 1;

    res.render('index', {isLogin: isLogin});
});


router.get('/login', function(req, res) {
    res.render('login.pug');
});

router.post('/login', function(req, res) {

    var email = req.body.email;
    var pw = req.body.pw;

    /* 사용자가 email과 혹은 pw를 보내지 않은 경우 */
    if (!email || !pw) {
        res.send("<script>alert('No value sended.'); history.back();</script>");
        res.end();
    }

    pw = lib.sha512(pw);

    // Promise 를 사용하여, Login 쿼리를 날림
    new Promise(function(resolve, reject) {
        var query = "SELECT * FROM `users` WHERE email = ? AND password = ?";
        conn.query(query, [email, pw], function(err, rows){
            if (err)
                throw err;

            resolve(rows[0]);
        });
    }).then(function(row) {
        // console.log(row);

        // rows 가 정의되지 않았을 때
        if (typeof row === "undefined") {
            res.send("<script>alert('Login failed. check your email or password. '); history.back(); </script>");
            // console.error(new Error('Whoops, rows is undefined at login script'));
            res.end();
        }

        else {
            req.session.no = row.no;
            req.session.email = row.email;
            req.session.nickname = row.nickname;
            req.session.registertime = row.registertime;
            req.session.admin = row.admin;

            req.session.save();
            res.send("<script>alert('login success'); location.href='/'; </script>");
        }
    });

});




router.get('/logout', function(req, res) {
    req.session.destroy();
    res.writeHead(302, { 'Content-Type': 'text/html',
                            'Location': '/' });
    res.end();
})


router.get('/register', function(req, res) {
    res.render('login.pug');
});

router.post('/register', (req, res) => {

    if (req.body.pw !== req.body.re_pw) {
        res.send(`<script>
                    alert('Your two passwords are different.');
                    history.back();
                </script>`);
    }

    var email = req.body.email;
    var nickname = req.body.nickname;
    var password = lib.sha512(req.body.pw);

    lib.isUserInfoExist(email, nickname, (result) => {
        if (result) {
            res.send(`<script>
                            alert('username or nickname is already exist');
                            history.back();
                        </script>`);
        }

        else {
            lib.insertUser(email, nickname, password);

            var data = `<script>
                            alert("register ok");
                            location.href = '/';
                        </script>`;
            res.send(data);
        }
    });

});

module.exports = router;
