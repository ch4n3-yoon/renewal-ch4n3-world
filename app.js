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

app.use('/', route);


//////////////////////////////////////////////

/* Useful Functions */
var isLogin = (email) => {
    if (!email) {
        res.send("<script>alert('Login is required.'); location.href = '/login'; </script>");
        res.end();
    }
};



route.get('/', function(req, res) {

    var isLogin = 0;

    // 로그인한 상태인지 확인
    if (req.session.email)
        isLogin = 1;

    res.render('index', {isLogin: isLogin});
});





route.get('/about', function(req, res) {
    res.render('about');
});

route.get('/login', function(req, res) {
    console.log(req.session);
    res.render("login.pug");
});

route.post('/login', function(req, res) {

    // set session variable
    const sess = req.session;

    var email = req.body.email;
    var pw = req.body.pw;


    ipLog(req.ip, email);

    // 혹시라도 email값이나 pw 값을 보내지 않았을 경우 다음 분기문을 실행함.
    if (!email && !pw) {
        res.write("<script>alert('No value sended.'); history.back();</script>");
        // res.end();
    }

    // 패스워드를 입력했다면 sha512로 Hashing 함
    if (pw)
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

            sess.no = row.no;
            sess.email = row.email;
            sess.nickname = row.nickname;
            sess.registertime = row.registertime;
            sess.admin = row.admin;

            console.log(sess);
            sess.save();

            res.send("<script>alert('login success'); location.href='/'; </script>");
        }
    });

});






route.get('/logout', function(req, res) {
    req.session.destroy(function(err){
        // cannot access session here
    });
    res.writeHead(302, { 'Content-Type': 'text/html',
                            'Location': '/' });
    res.end();
})


route.get('/register', function(req, res) {
    res.render('login.pug');
});

route.post('/register', function(req, res){
    var email, nickname, pw;
    var ok = 1;
    if (req.body.pw != req.body.re_pw) {
        res.send("<script>alert('Your two passwords are different.');history.back();</script>");
    }

    email = req.body.email;
    nickname = req.body.nickname;
    pw = lib.sha512(req.body.pw);

    // 중복된 계정이 있는지 확인
    var query = "SELECT * FROM `users` WHERE email = ? or nickname = ?";
    conn.query(query, [email, nickname], function(err, rows){
        /*
            rows.length 가 0이 아니라면 중복된 계정이 있다는 뜻.
            rows.length 가 0이라면 중복된 계정이 없음.
        */
        if (rows.length != 0) {
            res.send("<script>alert('Duplicated email or nickname');history.back();</script>");
        } else {
            console.log(query);
            var query = "INSERT INTO `users` (`email`, `nickname`, `password`, `registertime`) VALUES (?, ?, ?, NOW())";
            conn.query(query, [email, nickname, pw], function(err, rows){
                lib.error(err);

                console.log("[+] " + nickname + " has inserted.");

                res.send("<script>alert('register ok.'); location.href='/';</script>");
            });
        }
    });
});





route.get('/team', function(req, res) {
    res.send('just team view');
});

app.get('/user/:no', async (req, res) => {

    // 이메일이 주워지면, 해당 계정이 어떤 문제를 풀었는지 갖고 오는 코드
    var getSolvedChall = async (email) => {

        return new Promise(async (resolve, reject) => {
            var query = "select solvedno, ";
            query += "(select title from challenges where challenges.no = solvers.solvedno) as title, ";
            query += "solvetime from solvers ";
            query += "where email = ? order by solvetime desc";

            var queryResult = await conn.query(query, [email], (err, rows) => {
                resolve(rows);
            });

        });

    };

    // 해당 문제를 몇 번째로 풀었는지 갖고 오는 코드
    var getSolveRank = async (solvedno, email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select *, ";
            query += "(select count(*) + 1 from solvers as s where s.solvetime < solvers.solvetime and s.solvedno = solvers.solvedno) as rank ";
            query += "from solvers where solvedno = ? and email = ?";

            var queryResult = conn.query(query, [solvedno, email], async (err, rows) => {
                resolve(rows[0].rank);
            });

        });
    };

    var no2email = async (no) => {
        return new Promise(async (resolve, reject) => {
            var query = "select email from users where no = ?";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].email);
            });
        });
    }

    // hidden이 걸려 있지 않은 모든 문제들을 갖고 오는 코드
    var getAllChallenges = async () => {

        return new Promise(async (resolve, reject) => {

            var query = "select * from challenges where hidden = 0 order by point asc";

            var queryResult = await conn.query(query, async (err, rows) => {
                resolve(rows);
            });

        });

    };

    // 이메일을 닉네임으로 변환시키는 코드
    var no2nickname = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select nickname from users where no = ? ";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].nickname);
            });

        });
    };



    var main = async () => {

        return new Promise(async (resolve, reject) => {

            let no = Number(req.params.no);
            var email = await no2email(no);

            var solvedChall = await getSolvedChall(email);
            var solvedChallenges = [];

            for (var i = 0; i < solvedChall.length; i++ ) {

                // 해당 문제를 빠르게 푼 순위
                var solvedRank = await getSolveRank(solvedChall[i].solvedno, email);

                var solvedChallenge = {
                    no: solvedChall[i].solvedno,
                    title: solvedChall[i].title,
                    solvetime: solvedChall[i].solvetime,
                    rank: solvedRank
                };

                solvedChallenges.push(solvedChallenge);

            }

            res.render('./user_info', {solvedChallenges: solvedChallenges, allChallenges: await getAllChallenges(), nickname: await no2nickname(no)});

        });

    }

    main();

})


route.get('/challenge', async (req, res) => {

    // 로그인을 하지 않았을 경우
    // challenge listing 에 접근하지 못하도록 함.
    if (!req.session.email) {
        res.send("<script>alert('Login plz'); location.href='/login' </script>");
        res.end();
        return;
    }

    var email = req.session.email;

    if (email === 'adwdakdmadaw@gmail.com') {
        console.log("[*] strange user detected : ");
        console.log("email : " + email + " | ip : " + req.ip);
    }

    else {
        console.log("email : " + email + " | ip : " + req.ip);
    }

    ipLog(req.ip, email);

    var no = req.session.no;

    var challenges = [];
    var categorys = [];


    // 문제 분야들 뭐가 있는지 가져옴
    var query = "select category from challenges where hidden = 0 group by category";
    conn.query(query, function(err, rows){
        if (err) {
            res.status(500);
        } else {
            for (var i = 0; i < rows.length; i++) {
                categorys.push(rows[i].category);
            }
        }
    });

    var getSolvers = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select count(*) as solvers from solvers where solvedno = ?";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].solvers);
            });

        });
    };

    var isSolvedChall = async (no, email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select * from solvers where solvedno = ? and email = ? ";
            var queryResult = await conn.query(query, [no, email], async (err, rows) => {
                // 문제를 풀지 않은 상태
                // console.log(rows);
                if (rows.length == 0) {
                    resolve(0);
                } else {
                    resolve(1);
                }
            });

        });
    }



    var query = "SELECT * FROM `challenges`";
    conn.query(query, async (err, rows) => {

        if (err) {
            res.status(500).json({ "status_code": 500, "status_message": "internal server error" });
        } else {
            for (var i = 0; i < rows.length; i++) {
                var challenge = {
                    'no': rows[i].no,
                    'title': rows[i].title,
                    'point': rows[i].point,
                    'category': rows[i].category,
                    'description': rows[i].description,
                    'author': rows[i].author,
                    'solvers': rows[i].solvers,
                    'flag': rows[i].flag,
                    'hidden': rows[i].hidden,
                    'solvers': await getSolvers(rows[i].no),
                    'isSolvedChall': await isSolvedChall(rows[i].no, email)
                };
                challenges.push(challenge);
            }
        }
        res.render('chall_list.pug', { 'challenges': challenges, 'categorys': categorys });
    });

    // res.render('chall_list.pug', { 'challenges': challenges });
});







route.get('/challenge/:no', async (req, res) => {

    console.log(req.session);

    // 로그인을 하지 않았을 경우
    // challenge listing 에 접근하지 못하도록 함

    if (!req.session.email) {
        res.send("<script>alert('Login plz'); location.href='/login'  </script>");
        res.end();
        return;
    }

    ipLog(req.ip, req.session.email);


    // hidden 값이 적용되어 있는 경우 접근하지 못하도록 함.
    var isHidden = async (no) => {
        return new Promise(async (resolve, reject) => {
            var query = "select hidden from challenges where no = ? ";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].hidden);
            });
        });
    };


    if (await isHidden(req.params.no) === 1) {
        res.send("<script>alert('You cant access to this challenge..'); history.back();</script>");
        res.end();
    }

    // DB에서 빼온 값을 저장하기 위한 변수 선언
    var title, no, description;
    var files = [];

    no = Number(req.params.no);
    console.log("[*] User access to " + no);
    console.log(lib.getFiles(no));

    new Promise(function(resolve, reject) {
        fs.readdir('uploads/' + no, function(err, items) {
            // console.log(items);
            console.log("[*] readdir ./uploads/" + no);
            files = items;
        });
    });

    new Promise(function(resolve, reject) {
        var query = "SELECT * FROM `challenges` WHERE `no`=?";
        result = conn.query(query, [no], function(err, rows) {
            if (err)
                reject(err);
            // console.log(rows[0]);

            /*
                선언한 변수에 DB에서 나온 값들을 저장함
            */

            var challenge = {
                'no': rows[0].no,
                'title': rows[0].title,
                'point': rows[0].point,
                'category': rows[0].category,
                'description': rows[0].description,
                'author': rows[0].author,
                'solvers': rows[0].solvers,
                'flag': rows[0].flag
            };

            challenge.files = files;

            // console.log(challenge);
            resolve(challenge);
        });
    }).then(function(challenge) {
        // console.log(challenge);
        res.render('chall', challenge);
    });
});



// 플래그 인증 페이지
route.post('/challenge/:no/auth', async function(req, res) {

    // 로그인을 하지 않았을 경우
    // challenge listing 에 접근하지 못하도록 함.
    if (!req.session.email) {
        res.send("<script>alert('Login plz'); location.href='/login'; </script>");
        res.end();
        return;
    }

    var no = Number(req.params.no);
    var userFlag = req.body.flag;
    var email = req.session.email;
    var point = 0;

    var query = "SELECT * FROM `challenges` WHERE `no` = ?";

    var getFlag = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select flag from challenges where no = ? ";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].flag);
            });

        });
    };

    var getTitle = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select title from challenges where no = ?";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].title);
            });

        });
    };

    var getChallPoint = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select point from challenges where no = ?";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].point);
            });

        });
    };

    var decreasePoint = async (no) => {
        return new Promise(async (resolve, reject) => {

            var point = await getChallPoint(no);

            if (point > 10) {
                var query = "update challenges set point = point - 10 where no = ?";
                var queryResult = await conn.query(query, [no]);
                resolve(point - 10);
            }

            else
                resolve(point);

        });
    }

    var isAreadySolve = async (no, email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select * from solvers where solvedno = ? and email = ? ";
            var queryResult = await conn.query(query, [no, email], async (err, rows) => {

                if (rows.length >= 1)
                    resolve(rows[0].solvetime);

                else
                    resolve(0);

            });

        });
    };

    // solvers 테이블에 insert 함
    var insertIntoSolvers = async (no, email) => {
        return new Promise(async (resolve, reject) => {

            var query = "insert into solvers (solvedno, email, solvetime) ";
            query += "values (?, ?, now())";

            var queryResult = await conn.query(query, [no, email]);
            resolve();

        });
    }

    // authlog 테이블에 어떤 플래그를 입력했는지 insert 함
    var insertIntoAuthlog = async (no, email, flag, state) => {
        return new Promise(async (resolve, reject) => {

            var query = "insert into authlog (solvingno, email, enteredflag, state, trytime) ";
            query += "values (?, ?, ?, ?, now())";

            // 플래그를 입력했고 정답인 경우
            if (state !== 0) {
                state = 1;
            }

            var queryResult = await conn.query(query, [no, email, flag, state]);
            resolve();

        });
    };

    var main = async () => {
        return new Promise(async (resolve, reject) => {
            var solvetime = await isAreadySolve(no, email);
            // var title = await getTitle(no);

            // 문제를 풀지 않았을 때
            if (solvetime == 0) {

                var flag = await getFlag(no);
                if (flag === userFlag) {

                    await insertIntoSolvers(no, email);     // solvers 테이블에 insert
                    await decreasePoint(no);                // challenges 에 있는 해당 문제에 -10 점을 함
                    await insertIntoAuthlog(no, email, userFlag, 1);
                                                            // authlog 테이블에 insert

                    res.send("<script>alert('Correct flag!'); location.href = '/challenge'; </script>");
                    res.end();
                }

                else {

                    await insertIntoAuthlog(no, email, userFlag, 0);

                    res.send("<script>alert('flag is not correct'); history.back(); </script>");
                    res.end();
                }
            }

            else {
                // console.info("[*] " + req.session.nickname + "가 '" + title + "' 문제를 다시 " );
                res.send("<script>alert('you\\\'ve already solved it'); history.back(); </script>");
            }

            resolve();

        });
    };


    main();

});



// 랭킹 페이지
// 2018.06.06 17:18 정상 작동 확인
route.get('/rank', async (req, res) => {

    var getUsers = async () => {

        return new Promise(async (resolve, reject) => {

            var query = "select *, ";
            query += "(select sum((select point from challenges where challenges.no = solvers.solvedno)) from solvers where email = users.email) as point, ";
            query += "(select solvetime from solvers where email = users.email order by solvetime desc limit 1) as lastsolvetime ";
            query += "from users where admin = 0 order by point desc, lastsolvetime asc ";

            var queryResult = await conn.query(query, (err, rows) => {
                resolve(rows);
            });

        });

    };


    var isLogin = () => {
        if (req.session.email)
            return 1;
        else
            return 0;
    }

    var setUsers = async (rows) => {

        return new Promise(async (resolve, reject) => {

            // point 가 null 값을 갖고 있다면 0으로 바꾼다.
            // lastsolvetime 이 null 이라면 'not yet'으로 바꾼다.
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].point === null)
                    rows[i].point = 0;

                if (rows[i].lastsolvetime === null)
                    rows[i].lastsolvetime = '😪';

            }

            resolve(rows);

        });

    };

    var main = async () => {

        return new Promise(async (resolve, reject) => {

            var users = await getUsers();
            var users = await setUsers(users);

            res.render('./rank', {users: users, isLogin: isLogin()});


            resolve();

        });

    };


    main();

});



// 관리자 페이지
// - 일부러 어드민 페이지 게싱 못하게 하려고 이런 naming 한 것 죄송합니다
route.get('/secretjuju', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }

            });

        });
    };

    var main = async () => {
        return new Promise(async (resolve, reject) => {

            if (!req.session.email) {
                res.send("<script>alert('Login Please'); location.href='/login';</script>");
                res.end();
            }

            var email = req.session.email;
            await isAdmin(email);
            res.render('admin');

        });
    };

    main();

});

// 문제 관리하는 페이지
// 2018.05.18 00:39 정상 작동 확인
route.get('/secretjuju/challenge', async (req, res) => {
    var challenges = [];
    var categorys = [];

    if (!req.session.email) {
        res.send("<script>alert('This page requires admin authority'); location.href='/login';</script>");
        res.end();
    }

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }

            });

        });
    };

    var getAllCategorys = async () => {
        return new Promise(async (resolve, reject) => {

            var categorys = [];

            var query = "select category from challenges group by category";
            var queryResult = await conn.query(query, async (err, rows) => {
                for (var i = 0; i < rows.length; i++) {
                    categorys.push(rows[i].category);
                }

                resolve(categorys);
            });

        });
    };

    var getSolvers = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select count(*) as solvers from solvers where solvedno = ?";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].solvers);
            });

        });
    };

    var getAllChallenges = async () => {
        return new Promise(async (resolve, reject) => {

            var challenges = [];

            var query = "select * from challenges";
            var queryResult = await conn.query(query, async (err, rows) => {
                resolve(rows);
            });

        });
    }


    var main = async () => {
        return new Promise(async (resolve, reject) => {

            var email = req.session.email;
            await isAdmin(email);

            var categorys = await getAllCategorys();
            var challenges = await getAllChallenges();

            for (var i = 0; i < challenges.length; i++) {
                challenges[i].solvers = await getSolvers(challenges[i].no);
            }


            res.render('./admin_chall_list', { 'challenges': challenges, 'categorys': categorys });
        });
    };

    main();

});

// 문제 수정 페이지
// 2018.05.18 11:03 정상 작동 확인
route.get('/secretjuju/challenge/:no', function(req, res) {
    // DB에서 빼온 값을 저장하기 위한 변수 선언
    no = Number(req.params.no);
    console.log("[*] Admin access to " + no);
    var files = [];

    if (!req.session.email) {
        res.send("<script>alert('This page requires admin authority'); location.href='/login';</script>");
        res.end();
    }

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };


    new Promise(function(resolve, reject) {
        fs.readdir('uploads/' + no, function(err, items) {
            // console.log(items);
            console.log("[*] readdir ./uploads/" + no);
            resolve(items);
        });
    }).then(function(items) {
        files = items;
    });

    new Promise(async (resolve, reject) => {

        var query = "SELECT * FROM `challenges` WHERE `no`=?";
        result = conn.query(query, [no], function(err, rows) {
            if (err)
                reject(err);

            // 선언한 변수에 DB에서 나온 값들을 저장함
            challenge = {
                'no': rows[0].no,
                'title': rows[0].title,
                'point': rows[0].point,
                'category': rows[0].category,
                'description': rows[0].description,
                'author': rows[0].author,
                'solvers': rows[0].solvers,
                'flag': rows[0].flag,
                'hidden': rows[0].hidden,
            }

            challenge.files = files;
            challenge.description = lib.replaceAll(challenge.description, "<br>", "\n");

            resolve(challenge);
        });
    }).then(async (challenge) => {
        var email = req.session.email;
        await isAdmin(email);
        res.render('admin_chall_view', challenge);
        // console.log({ no: no, title: title, description: description });
    });
});

// 파일업로드 기능 추가
// 2018.05.21 정상 작동 확인
route.post('/secretjuju/challenge/:no', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };

    var email = req.session.email;
    await isAdmin(email);

    no = Number(req.params.no);

    // console.log(req.body);
    var title = req.body.title;
    var category = req.body.category;
    var author = req.body.author;
    var description = req.body.description;
    var flag = req.body.flag;

    var hidden = 0;

    // hidden 이 체크되어 있는 경우 hidden 값을 1로 바꿈
    if (req.body.hidden)
        hidden = 1;

    var files = req.files['file[]'];
    var filepath = "uploads/" + no + "/";
    var fileList = [];



    // 윈도우의 개행문자 \r\n을 \n으로 바꿈
    description = lib.replaceAll(description, "\r\n", "<br>");
    description = lib.replaceAll(description, "\n", "<br>");


    // 업로드한 파일이 있다면 해당 분기를 실행함.
    if (typeof files !== 'undefined')
    {
        new Promise(function(resolve, reject) {
            // console.log(files);
            // console.log(typeof files.length);

            // 파일을 1개만 받았을 경우
            if (typeof files.length === 'undefined') {
                files = [files];
            }

            for (var i = 0; i < files.length; i++)
            {
                // console.log(2222);
                // console.log(files[i]);
                fileList.push(filepath + files[i].name);
                files[i].mv(filepath + files[i].name, function(err) {
                    if (err)
                        throw err;
                });
            }

            console.log(fileList);

            resolve();

        }).then(function() {
            fs.readdir(filepath, function(err, items) {
                console.log(items);
                console.log("[*] readdir ./uploads/" + no);
                return items;
            });
        }).then(function(files) {
            if (files != undefined) {
                if (files.length == 0)
                    fileList = "";
                else
                    fileList = files.join("|");
            }
        });
    }


    console.log(fileList);
    console.log(fileList.join("|"));

    var query = "update challenges set ";
    query += "title = ?, category = ?, author = ?, description = ?, files = ?, hidden = ?, flag = ? ";
    query += "where no = ?";

    new Promise(function(resolve, reject) {
        conn.query(query, [title, category, author, description, fileList.join("|"), hidden, flag, no]);
        resolve();
    }).then(function() {
        res.send("<script>alert('modify ok');location.href='/secretjuju/challenge';</script>");
    });
});


// 정말로 문제를 삭제하시겠습니까?
route.get('/secretjuju/challenge/:no/realrudaganya', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };

    var email = req.session.email;
    await isAdmin(email);

    var no = Number(req.params.no);

    var code = `
        <script>
            alert('문제를 삭제하면 해당 문제를 푼 사용자의 점수가 깎입니다. 진행하시겠습니까?');
            var result = confirm('ㄹㅇ루 삭제하시겠습니까?');
            if (result) {
                location.href = '/secretjuju/challenge/`+no+`/delete';
            }

            else {
                history.back();
            }
        </script>
    `;

    res.send(code);
    res.end();

});

// 문제 삭제 코드
route.get('/secretjuju/challenge/:no/delete', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };

    var email = req.session.email;
    await isAdmin(email);

    var no = Number(req.params.no);

    // challenges 테이블에서 해당 chall을 삭제함.
    var deleteChallenge = async (no) => {
        return new Promise(async (resolve, reject) => {
            var query = "delete from challenges where no = ? ";
            var queryResult = await conn.query(query, [no]);

            resolve();
        });
    };

    // solvers 테이블에서 해당 Solve Logs를 삭제함
    var deleteSolveLog = async (no) => {
        return new Promise(async (resolve, reject) => {
            var query = "delete from solvers where solvedno = ? ";
            var queryResult = await conn.query(query, [no]);

            resolve();
        });
    };

    var main = async () => {
        return new Promise(async () => {
            await deleteChallenge(no);
            await deleteSolveLog(no);

            res.send("<script>alert('Successfully Deleted'); location.href = '/secretjuju/challenge';</script>")

            resolve();
        });
    };

    main()

});


route.get('/secretjuju/challenge/:no/deletefile/:filename', function(req, res) {
    no = Number(req.params.no);
    filename = req.params.filename;
    filepath = 'uploads/' + no + '/' + filename;
    console.log("[*] deleting " + filepath);

    fs.stat(filepath, function (err, stats) {
        if (err) {
            if (err.code != "ENOENT") {
                res.send("<script>alert('No such file');location.href='/secretjuju/challenge/"+no+"';</script>");
                return console.error(err);
            }
        }

        console.log(stats);

        fs.unlink(filepath, function(err) {
            if (err) {
                if(err.code != "ENOENT")
                {
                    return console.log(err);
                }
            } else {
                var query = "update `challenges` set files = replace(files,'"+filepath+"|','') ";
                query += "where no = ?";

                conn.query(query, [no]);
            }

            console.log("[*] " + filepath + " deleted successfully");
            res.send("<script>alert('"+filepath+" deleted successfully');location.href='/secretjuju/challenge/"+no+"';</script>");
        });
    });
});

route.get('/secretjuju/createChallenge', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };

    var email = req.session.email;
    if (await isAdmin(email)) {
        res.render('admin_chall_create');
    }

});

route.post('/secretjuju/createChallenge', function(req, res) {

    var filepath = "";

    var title = req.body.title;
    var category = req.body.category;
    var author = req.body.author;
    var description = req.body.description;
    var flag = req.body.flag;
    var hidden = 0;

    // hidden 이 체크되어 있는 경우 hidden 값을 1로 바꿈
    if (req.body.hidden)
        hidden = 1;

    var files = req.files['file[]'];
    var fileList = [];

    // console.log(req.body);
    // console.log(files);

    // 가장 최신의 idx를 가져온 뒤, no = idx + 1 하여 디렉토리 생성
    var no = 0;
    var query = "select no from challenges order by no desc limit 1";
    new Promise(function (resolve, reject) {
        conn.query(query, function(err, rows) {
            if (rows.length == 0)
                resolve(0);
            resolve(rows[0]);
        });
    }).then(function(row) {
        if (row == 0)
            return 1;
        else
            return row.no + 1;
    }).then(function(no) {
        filepath = 'uploads/' + no + '/';
        // console.log(filepath);
        return filepath;
    }).then(function(filepath) {
        fs.mkdir(filepath, function(err) {
            console.log("[*] Created " + filepath);
            if (err)
                if (err.code == 'EEXIST')
                    console.log("[x] " + filepath + " is arleady exist!");
        });
    }).then(function() {
        // 업로드된 파일이 없는 경우 return 함.
        if (!files)
            return 0;

        for (var i = 0; i < files.length; i++)
        {
            filepath = filepath + files[i].name;
            fileList.push(filepath);
            files[i].mv(filepath, function(err) {
                if (err)
                    throw err;
            });
        }
    }).then(function() {
        fileList = fileList.join('|');
        return fileList;
    }).then(function(fileList) {
        var query = "insert into `challenges` ";
        query += "(title, point, category, description, author, solvers, flag, files, hidden) ";
        query += "values (?, 500, ?, ?, ?, 0, ?, ?, ?) ";

        // console.log(query);
        // console.log([title, category, description, author, flag, fileList]);

        conn.query(query, [title, category, description, author, flag, fileList, hidden], function(err, rows) {
            if (err){
                throw err;
            }
        });
    });


    res.send("<script>alert('Publish ok');location.href='/secretjuju/challenge';</script>");
});


// 틀린 플래그 인증 로그
route.get('/secretjuju/wrongkey', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };


    var email2nickname = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select nickname from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {
                resolve(rows[0].nickname);
            });

        });
    };

    var getTitle = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select title from challenges where no = ? ";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].title);
            });

        });
    };

    var getWrongAuthlog = async () => {
        return new Promise(async (resolve, reject) => {

            var query = "select * from authlog where state = 0 order by no desc";
            var queryResult = await conn.query(query, async (err, rows) => {

                for (var i = 0; i < rows.length; i++) {
                    rows[i].title = await getTitle(rows[i].solvingno);
                    rows[i].nickname = await email2nickname(rows[i].email);
                }

                resolve(rows);
            });

        });
    };

    var main = async () => {
        return new Promise(async (resolve, reject) => {
            isLogin(req.session.email);
            var logs =  await getWrongAuthlog();
            res.render('admin_wrongkey', {logs: logs});
        });
    };

    var email = req.session.email;
    if (await isAdmin(email)) {
        main();
    }

});



// 맞은 플래그 인증 로그
route.get('/secretjuju/correctkey', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };

    var email2nickname = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select nickname from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {
                resolve(rows[0].nickname);
            });

        });
    };

    var getTitle = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select title from challenges where no = ? ";
            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].title);
            });

        });
    };

    var getCorrectAuthlog = async () => {
        return new Promise(async (resolve, reject) => {

            var query = "select * from authlog where state = 1 order by no desc";
            var queryResult = await conn.query(query, async (err, rows) => {

                for (var i = 0; i < rows.length; i++) {
                    rows[i].title = await getTitle(rows[i].solvingno);
                    rows[i].nickname = await email2nickname(rows[i].email);
                }

                resolve(rows);
            });

        });
    };

    var main = async () => {
        return new Promise(async (resolve, reject) => {
            var logs =  await getCorrectAuthlog();
            res.render('admin_correctkey', {logs: logs});
        });
    };

    var email = req.session.email;
    if (await isAdmin(email)) {
        main();
    }

});



// 관리자의 사용자 관리 페이지
route.get('/secretjuju/user', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };


    var getUsers = async () => {

        return new Promise(async (resolve, reject) => {

            var query = "select *, ";
            query += "(select sum((select point from challenges where challenges.no = solvers.solvedno)) from solvers where email = users.email) as point, ";
            query += "(select solvetime from solvers where email = users.email order by solvetime desc limit 1) as lastsolvetime ";
            query += "from users order by point desc ";

            var queryResult = await conn.query(query, (err, rows) => {
                resolve(rows);
            });

        });

    };

    var setUsers = async (rows) => {

        return new Promise(async (resolve, reject) => {

            // point 가 null 값을 갖고 있다면 0으로 바꾼다.
            // lastsolvetime 이 null 이라면 'not yet'으로 바꾼다.
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].point === null)
                    rows[i].point = 0;

                if (rows[i].lastsolvetime === null)
                    rows[i].lastsolvetime = '😪';
            }

            resolve(rows);

        });

    };

    var main = async () => {

        return new Promise(async (resolve, reject) => {

            var users = await getUsers();
            var users = await setUsers(users);

            res.render('./admin_user_list', {users: users});


            resolve();

        });

    };

    var email = req.session.email;
    if (await isAdmin(email)) {
        main();
    }

});



route.get('/secretjuju/user/:no', async (req, res) => {

    var isAdmin = async (email) => {
        return new Promise(async (resolve, reject) => {

            var query = "select admin from users where email = ?";
            var queryResult = await conn.query(query, [email], async (err, rows) => {

                if (rows.length === 0) {
                    res.send("<script>alert('Login is required.'); location.href='/login';</script>");
                    res.end();
                }

                if (rows[0].admin !== 1) {
                    res.send("<script>alert('You\\\'re not an administrator..'); location.href='/'; </script>");
                    res.end();
                    resolve(0);
                }

                else {
                    resolve(1);
                }
            });

        });
    };

    var no = Number(req.params.no);

    var getUserByNo = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select * from users where no = ? ";

            var queryResult = await conn.query(query, [no], async (err, rows) => {
                resolve(rows[0]);
            });

        });
    };

    var email = req.session.email;
    if (await isAdmin(email)) {
        res.render('admin_user_modify', {user: await getUserByNo(no)});
    }

});


route.post('/secretjuju/user/:no/modify', async (req, res) => {
    var no = Number(req.params.no);
    var email = req.body.email;
    var nickname = req.body.nickname;
    var password = req.body.password;
    var admin = 0;

    if (req.body.admin)
        admin = 1;

    var userModifyWithoutPassword = async (no, email, nickname, admin) => {
        return new Promise(async (resolve, reject) => {

            var query = "update users set email = ?, nickname = ?, admin = ? ";
            query += "where no = ?";

            var queryResult = await conn.query(query, [email, nickname, admin, no]);
            resolve();

        });
    };

    var userModifyWithPassword = async (no, email, nickname, password, admin) => {
        return new Promise(async (resolve, reject) => {

            var query = "update users set email = ?, password = ?, nickname = ?, admin = ? ";
            query += "where no = ?";

            var queryResult = await conn.query(query, [email, password, nickname, admin, no]);
            resolve();

        });
    };


    var main = async () => {
        if (password) {
            password = lib.sha512(password);
            await userModifyWithPassword(no, email, nickname, password, admin);
        }

        else {
            await userModifyWithoutPassword(no, email, nickname, admin);
        }

        res.send("<script>alert('Modify success'); location.href = '/secretjuju/user'; </script>");
    }

    await main();

});

// 정말로 사용자를 삭제하시겠습니까?
route.get('/secretjuju/user/:no/realrudaganya', async (req, res) => {
    var no = Number(req.params.no);

    var code = `
        <script>
            var result = confirm('ㄹㅇ루 삭제하시겠습니까?');
            if (result) {
                location.href = '/secretjuju/user/`+no+`/delete';
            }

            else {
                history.back();
            }
        </script>
    `;

    res.send(code);
    res.end();

});


route.get('/secretjuju/user/:no/delete', async (req, res) => {
    var no = Number(req.params.no);

    var deleteUserByNo = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "delete from users where no = ?";
            var queryResult = conn.query(query, [no]);

        });
    };

    var main = async () => {
        deleteUserByNo(no);
        res.send("<script>alert('Successfully deleted.'); location.href = '/secretjuju/user'; </script>");
        res.end();
    };

    main();

});




// 페이크용 관리자 페이지
route.get('/admin', function(req, res) {
    res.send("admin page? just guessing plz lol (grin)");
});

// Run the CTF server
var server = app.listen(serverConfig.port, function() {
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
