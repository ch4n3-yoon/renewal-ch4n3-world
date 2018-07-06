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

    var sess = req.session;

    var email = req.body.email;
    var password = req.body.pw;

    /* 사용자가 email 혹은 pw를 보내지 않은 경우 */
    if (!email || !password) {
        res.send("<script>alert('No value sended.'); history.back();</script>");
        res.end();
    }

    password = lib.sha512(password);

    lib.login(email, password, (result) => {
        if (result) {
            sess.no = result.no;
            sess.email = result.email;
            sess.nickname = result.nickname;
            sess.registertime = result.registertime;
            sess.admin = result.admin;

            sess.save();

            res.send(`<script>
                        alert('Successfully logged in');
                        location.href = '/';
                    </script>`);
        }

        else {
            var data = `<script>
                            alert('Login failed. Please check your email or password again');
                            history.back();
                        </script>`;
            res.send(data);
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
