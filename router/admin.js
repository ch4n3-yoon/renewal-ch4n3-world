var express = require('express');
var router = express.Router();

var lib = require('../lib.js');
var conn = require("../dbconnect.js").conn;

const fs = require('fs');

/*
    관리자 페이지
     - 문제 추가 / 수정 기능
     - 사용자 수정 기능
     - 문제 파일 업로드 및 삭제 기능
     - flag auth log 체크 기능
*/

var __admin_path__ = 'secretjuju';

router.get('/', async (req, res) => {

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
router.get('/challenge', async (req, res) => {
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
router.get('/challenge/:no', function(req, res) {
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
router.post('/challenge/:no', async (req, res) => {

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
        res.send(`<script>
                    alert('modify ok');
                    location.href = '/${__admin_path__}/challenge';
                </script>`);
    });
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


router.get('/challenge/:no/deletefile/:filename', function(req, res) {
    no = Number(req.params.no);
    filename = req.params.filename;
    filepath = 'uploads/' + no + '/' + filename;
    console.log("[*] deleting " + filepath);

    fs.stat(filepath, function (err, stats) {
        if (err) {
            if (err.code != "ENOENT") {
                res.send(`<script>
                            alert('No such file');
                            location.href = '/${__admin_path__}/challenge/${no}';
                        </script>`);
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

            res.send(`<script>
                        alert('${filepath} deleted successfully');
                        location.href = '/${__admin_path__}/challenge/${no}';
                    </script>`);
        });
    });
});

router.get('/createChallenge', async (req, res) => {

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

router.post('/createChallenge', function(req, res) {

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


    res.send(`<script>
                alert('Publish ok');
                location.href = '/${__admin_path__}/challenge';
            </script>`);
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
