const express = require('express');
const fs = require('fs');
const router = express.Router();

const lib = require('../lib.js');
const conn = require("../dbconnect.js").conn;
const config = require('../config/serverConfig');

const API = require('../api/challenge');
const FUNC = require('../api/function');
const solversAPI = require('../api/solvers');
const logAPI = require('../api/log');
const userAPI = require('../api/user');

const __admin_path__ = config.adminPath;

/*
    관리자 페이지
     - 문제 추가 / 수정 기능
     - 사용자 수정 기능
     - 문제 파일 업로드 및 삭제 기능
     - flag auth log 체크 기능
*/

let isAdmin = async (user_no) => {
    let sqlData = await userAPI.isAdmin(user_no);
    return sqlData.dataValues.admin;
};

router.get('/', async (req, res) => {

    let main = async () => {
        let user_no = req.session.user_no;
        if (await isAdmin(user_no))
        {
            res.render('admin');
        }

        else
        {
            res.send("<script>alert('you are not admin'); location.href='/login'; </script>");
        }
    };

    main();

});


// 문제 관리하는 페이지
// 2018.05.18 00:39 정상 작동 확인
router.get('/challenge', async (req, res) => {

    let getSolvers = async (chall_no) => {
        return await API.getNumberOfSolver(chall_no);
    };

    let getChallenges = async () => {
        let sqlData = await API.getAllChalls();
        let challenges = [];
        for (let i = 0; i < sqlData.length; i++)
        {
            challenges.push(sqlData[i].dataValues);
        }

        for (let i = 0; i < challenges.length; i++)
        {
            challenges[i].solvers = await getSolvers(challenges[i].no);
        }

        return challenges;
    };

    let getCategorys = async () => {
        let sqlData = await API.getAllCategorys();
        let categorys = [];
        for (let i = 0; i < sqlData.length; i++)
        {
            categorys.push(sqlData[i].dataValues.category);
        }

        return categorys;
    };

    let main = async () => {

        let user_no = req.session.user_no;
        if (!req.session.user_no || !await isAdmin(user_no))
            return res.send("<script>alert('This page need your admin permission.'); location.href='/login';</script>");

        let challenges = await getChallenges();
        let categorys = await getCategorys();

        res.render('./admin_chall_list', { 'challenges': challenges, 'categorys': categorys });
    };

    main();

});

// 문제 수정 페이지
// 2018.05.18 11:03 정상 작동 확인
// 2018.08.23 13:49 정상 작동 확인
router.get('/challenge/:chall_no', function(req, res) {

    let getChallenge = async (chall_no) => {
        let sqlData = await API.getByNo(chall_no);
        return sqlData.dataValues;
    };

    let main = async () => {

        let user_no = req.session.user_no;
        if (!req.session.user_no || !await isAdmin(user_no))
        {
            res.send("<script>alert('Sorry, this page need admin permission.'); location.href = '/login'; </script>");
            return res.end();
        }


        let chall_no = Number(req.params.chall_no);
        let challenge = await getChallenge(chall_no);

        let path = `./public/uploads/${chall_no}/`;
        challenge.files = await FUNC.readDir(path);

        challenge.description = lib.replaceAll(challenge.description, "<br>", "\n");
        res.render('admin_chall_view', {'challenge': challenge});
    };

    main();

});



// 파일업로드 기능 추가
// 2018.05.21 정상 작동 확인
// 2018.08.23 15:05 정상 작동 확인
router.post('/challenge/:challenge_no', async (req, res) => {

    let uploadFiles = async (path, files) => {
        if (!files)
            return;

        if (typeof files.length === 'undefined') {
            files = [files];
        }

        for (let i = 0; i < files.length; i++)
        {

            files[i].mv(path + files[i].name, (err) => {
                if (err)
                    throw err;
            });
        }
    };

    let updateChallenge = async (chall_no, title, author, category, description, flag, hidden) => {
        return await API.updateChallenge(chall_no, title, author, category, description, flag, hidden);
    };

    let main = async () => {
        let challenge_no = req.params.challenge_no;
        let path = `./public/uploads/${challenge_no}/`;

        let title = req.body.title;
        let category = req.body.category;
        let author = req.body.author;
        let description = req.body.description;
        let flag = req.body.flag;

        let hidden = 0;
        if (req.body.hidden)
            hidden = 1;

        description = lib.replaceAll(description, "\r\n", "\n");

        let files = req.files['file[]'];

        uploadFiles(path, files);
        updateChallenge(challenge_no, title, author, category, description, flag, hidden);
        res.send(`<script>
                    alert('modify ok');
                    location.href = '/${__admin_path__}/challenge';
                </script>`);
    };

    main();

});


// 정말로 문제를 삭제하시겠습니까?
router.get('/challenge/:no/realrudaganya', async (req, res) => {

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
                location.href = '/${__admin_path__}/challenge/${no}/delete';
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
router.get('/challenge/:no/delete', async (req, res) => {

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

            res.send(`<script>
                        alert('Successfully deleted');
                        location.href = '/${__admin_path__}/challenge';
                    </script>`);

            resolve();
        });
    };

    main()

});


router.get('/challenge/:no/deletefile/:filename', async (req, res) => {

    let chall_no = req.params.no;
    let filename = req.params.filename;

    let main = async () => {

        FUNC.removeFile(chall_no, filename);
        res.send(`<script>
                        alert('File deleted successfully');
                        location.href = '/${__admin_path__}/challenge/${chall_no}';
                    </script>`);
    };

    await main();

});

router.get('/createChallenge', async (req, res) => {

    let main = async () => {
        let user_no = req.session.user_no;
        if (!req.session.user_no || !await isAdmin(user_no))
            return res.send("<script>alert('This page need root permission.'); location.href='/login'; </script>");

        else
            return res.render('admin_chall_create');
    };

    await main();

});

router.post('/createChallenge', async (req, res) => {

    let createChallenge = async (title, author, category, description, flag, hidden) => {
        return await API.createChallenge(title, author, category, description, flag, hidden)
    };

    let getCurrentChallenge = async () => {
        let sqlData = await API.getCurrentChall();
        return sqlData.dataValues;
    };

    let uploadFiles = async (path, files) => {
        if (!files)
            return;

        if (typeof files.length === 'undefined') {
            files = [files];
        }

        for (let i = 0; i < files.length; i++)
        {

            files[i].mv(path + files[i].name, (err) => {
                if (err)
                    throw err;
            });
        }
    };

    let main = async () => {
        let title = req.body.title;
        let category = req.body.category;
        let author = req.body.author;
        let description = req.body.description;
        let flag = req.body.flag;
        let hidden = 0;
        if (req.body.hidden)
            hidden = 1;
        let files = req.files['file[]'];

        await createChallenge(title, author, category, description, flag, hidden);

        let challenge = await getCurrentChallenge();
        let chall_no = challenge.no;
        let path = `./public/uploads/${chall_no}/`;
        await FUNC.makeDir(path);
        await uploadFiles(path, files);

        res.send(`<script>
                alert('Publish ok');
                location.href = '/${__admin_path__}/challenge';
            </script>`);

    };

    await main();

});


// 틀린 플래그 인증 로그
router.get('/wrongkey', async (req, res) => {

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
router.get('/correctkey', async (req, res) => {

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
router.get('/user', async (req, res) => {

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
        var users = await getUsers();
        var users = await setUsers(users);

        res.render('./admin_user_list', {users: users});
    };

    var email = req.session.email;
    if (await isAdmin(email)) {
        main();
    }

});



router.get('/user/:no', async (req, res) => {

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


router.post('/user/:no/modify', async (req, res) => {
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

        res.send(`<script>
                    alert('Modify success');
                    location.href = '/${__admin_path__}/user';
                </script>`);
    }

    await main();

});

// 정말로 사용자를 삭제하시겠습니까?
router.get('/user/:no/realrudaganya', async (req, res) => {
    var no = Number(req.params.no);

    var code = `
        <script>
            var result = confirm('ㄹㅇ루 삭제하시겠습니까?');
            if (result) {
                location.href = '/${__admin_path__}/user/${no}/delete';
            }

            else {
                history.back();
            }
        </script>
    `;

    res.send(code);
    res.end();

});


router.get('/user/:no/delete', async (req, res) => {
    var no = Number(req.params.no);

    var deleteUserByNo = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "delete from users where no = ?";
            var queryResult = await conn.query(query, [no]);

        });
    };

    var no2email = async (no) => {
        return new Promise(async (resolve, reject) => {
            var query = "select email from users where no = ?";
            var queryResult = await conn.query(query, [no], (err, rows) => {
                // 해당 사용자가 존재하지 않는 경우
                if (rows.length === 0) {
                    resolve(0);
                }

                else {
                    resolve(rows[0].email);
                }
            });
        });
    }

    var getSolvedChallenge = async (no) => {
        return new Promise(async (resolve, reject) => {
            var email = no2email(no);
            var query = "select * from solvers where email = ?";
            var queryResult = await conn.query(query, [email], (err, rows) => {
                resolve
            });
        });
    }

    var increaseSolvedChallengePoint = async (no) => {
        return new Promise(async (resolve, reject) => {
            var solvedChallenges = getSolvedChallenge(no);
            for (var i = 0; i < solvedChallenges.length; i++) {
                var solvedno = solvedChallenges[i].solvedno;
                var query = "update challenges set point = point + 10 where no = ?";
                var queryResult = await conn.query(query, [solvedno]);
            }
        });
    };

    var main = async () => {
        increaseSolvedChallengePoint(no);
        deleteUserByNo(no);
        res.send(`<script>
                    alert('Successfully deleted.');
                    location.href = '/${__admin_path__}/user';
                </script>`);
        res.end();
    };

    main();

});

module.exports = router;
