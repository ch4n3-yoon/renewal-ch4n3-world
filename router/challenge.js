const express = require('express');
const router = express.Router();

const lib = require('../lib.js');
const conn = require("../dbconnect.js").conn;

const API = require('../api/challenge');
const FUNC = require('../api/function');

router.get('/', async (req, res) => {

    if (!FUNC.isLogin(req, res))
        return;

    let email = req.session.email;
    let no = req.session.no;

    var challenges = [];
    var categorys = [];
    categorys = await API.getCategory();
    console.log(categorys);

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
                    'solvers': await API.getNumberOfSolver(rows[i].no),
                    'isSolvedChall': await isSolvedChall(rows[i].no, email)
                };
                challenges.push(challenge);
            }
        }
        res.render('chall_list.pug', { 'challenges': challenges, 'categorys': categorys });
    });

    // res.render('chall_list.pug', { 'challenges': challenges });
});







router.get('/:no', async (req, res) => {

    var getChallenge = async (no) => {
        return new Promise(async (resolve, reject) => {
            var query = "select * from challenges where no = ?";
            var queryResult = await conn.query(query, [no], async (err, rows) => {

                if (rows.length === 0) {
                    resolve(0);
                }

                else {
                    var challenge = rows[0];
                    challenge.files = await lib.getFiles(no);

                    resolve(challenge);
                }

            });
        });
    };

    var main = async () => {
        var no = Number(req.params.no);
        var email = req.session.email;

        if (!email) {
            res.send(`<script>
                        alert('This page needs your login ㅠㅠ');
                        location.href = '/login';
                    </script>`);
            return;
        }

        var challenge = await getChallenge(no);

        /*
            1. 문제가 존재하지 않을 경우
            2. 문제에 hidden이 적용되어 있는 경우
        */
        if (!challenge || challenge.hidden === 1) {
            console.log(`[x] ${req.session.nickname} has accessed invalid path (/challenge/${no})`);
            res.send("<script>alert('Invalid access detected'); history.back(); </script>");
            return -1;
        }

        res.render('./chall', challenge);
    }

    main();

});



// 플래그 인증 페이지
router.post('/:no/auth', async function(req, res) {

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
            var queryResult = conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].title);
            });

        });
    };

    var getChallPoint = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select point from challenges where no = ?";
            var queryResult = conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].point);
            });

        });
    };

    var decreasePoint = (no) => {
        return new Promise(async (resolve, reject) => {

            var point = await getChallPoint(no);

            if (point > 10) {
                var query = "update challenges set point = point - 10 where no = ?";
                var queryResult = conn.query(query, [no]);
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

                    insertIntoSolvers(no, email);       // solvers 테이블에 insert
                    decreasePoint(no);                  // challenges 에 있는 해당 문제에 -10 점을 함
                    insertIntoAuthlog(no, email, userFlag, 1);
                                                        // authlog 테이블에 insert

                    res.send(`<script>
                                alert('Correct flag!');
                                location.href = '/challenge';
                            </script>`);
                    res.end();
                }

                else {

                    insertIntoAuthlog(no, email, userFlag, 0);
                    res.send("<script>alert('wrong flag'); history.back(); </script>");
                    res.end();
                }
            }

            else {
                res.send("<script>alert('you\\\'ve already solved it'); history.back(); </script>");
            }

            resolve();

        });
    };


    main();

});

module.exports = router;
