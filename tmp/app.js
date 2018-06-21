var express = require("express");
const path = require("path");
var bodyParser = require('body-parser');
var crypto = require("crypto");
var conn = require("./dbconnect").conn;
var lib = require("./lib");
const fileUpload = require('express-fileupload');
const fs = require("fs");
const session = require('express-session');

const port = 80;

var app = express();
var route = express.Router();

app.use(express.Router());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 세션 관련 처리
app.use(session({
    secret: 'what is love we can fly@#',
    resave: false,
    saveUninitialized: true,
    cookie: { path: '/', httpOnly: true, secure: false, maxAge: null }
}));

// 보안 상의 이유로 X-powered-by 헤더 없앰
app.disable('x-powered-by');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(fileUpload());
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use('/', route);

///////////////////////////////////////////////////////////////////

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

    // 혹시라도 email값이나 pw 값을 보내지 않았을 경우 다음 분기문을 실행함.
    if (!email && !pw) {
        res.sned("<script>alert('No value sended.'); history.back();</script>");
        res.end();
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
            res.send("<script>alert('mysql result is undefined. plz mail to ch4n3.yoon@gmail.com'); history.back(); </script>");
            console.error(new Error('Whoops, rows is undefined at login script'));
            res.end();
        }

        if (row.length === 0) {
            res.send("<script>alert('Login failed'); history.back(); </script>");
        } else { 

            sess.no = row.no;
            sess.email = row.email;
            sess.nickname = row.nickname;
            sess.registertime = row.registertime;
            
            console.log(sess);
            sess.save();
        }
    });

     res.redirect('/');

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


route.get('/challenge', function(req, res) {

    // 로그인을 하지 않았을 경우 
    // challenge listing 에 접근하지 못하도록 함.
    if (!req.session.email) {
        res.send("<script>alert('Login plz'); location.href='/login' </script>");
        res.end();
    }

    var challenges = [];
    var categorys = [];


    // 문제 분야들 뭐가 있는지 가져옴
    var query = "select category from challenges group by category";
    conn.query(query, function(err, rows){
        if (err) {
            res.status(500);
        } else {
            for (var i = 0; i < rows.length; i++) {
                categorys.push(rows[i].category);
            }
        }
    });



    var query = "SELECT * FROM `challenges`";
    conn.query(query, function(err, rows) {
        
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
                };
                challenges.push(challenge);
            }
        }
        res.render('chall_list.pug', { 'challenges': challenges, 'categorys': categorys });
    });

    // res.render('chall_list.pug', { 'challenges': challenges });
});







route.get('/challenge/:no', function(req, res) {

    console.log(req.session);


    // 로그인을 하지 않았을 경우 
    // challenge listing 에 접근하지 못하도록 함.
    if (!req.session.email) {
        res.send("<script>alert('Login plz'); location.href='/login'  </script>");
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
route.post('/challenge/:no/auth', function(req, res) {

    // 로그인을 하지 않았을 경우 
    // challenge listing 에 접근하지 못하도록 함.
    if (!req.session.email) {
        res.send("<script>alert('Login plz'); location.href='/login'; </script>");
        res.end();
    }

    var no = Number(req.params.no);
    var userFlag = req.body.flag;
    var email = req.session.email;

    var query = "SELECT * FROM `challenges` WHERE `no` = ?";

    new Promise(function(resolve, reject) {
        conn.query(query, [no], function(err, rows) {
            if (err)
                throw err;
            
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

            resolve(challenge);
            
        });
    }).then(function(challenge) {

        // DB에서 가져온 flag를 변수에 저장함.
        var flag = challenge.flag;

        new Promise(function(resolve, reject) {

            var query = "SELECT * FROM `solvers` WHERE `solvedno` = ? AND `email` = ?";
            conn.query(query, [no, email], function(err, rows) {

                // 사용자가 이미 문제를 푼 상태
                if (rows) {
                    res.send("<script>alert('You\\\'ve already solved it.'); location.href='/challenge'</script>");
                    res.end();
                }

                else {
                    resolve();
                }

            });

        }).then(function() {

            // 사용자가 입력한 플래그와 DB에 저장되어 있는 플래그가 일치함.;
            if (userFlag === flag) {

                console.log('[*] 플래그가 맞았습니다.');
                res.send("<script>alert('Correct!'); location.href='/challenge'; </script>"); 
                var query = "INSERT INTO `solvers` (`solvedno`, `email`, `solvetime`) ";
                query += "VALUES ( ?, ?, NOW() )";

                conn.query(query, [no, req.session.email]);

            }
        
            else {
            
                res.send("<script>alert('Failed')\nhistory.back()</script>");
                console.log('[x] 플래그가 틀렸습니다. ');
                console.log('[x] 플래그는 : ' + flag + '입니다. ');

            }
        });
    });
});


// 랭킹 페이지
route.get('/rank', function(req, res) {

    var users = [];
    
    var query = "select * from users";
    conn.query(query, function(err, rows) {
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var point = 0;

            var user = {
                no: row.no,
                email: row.email,
                nickname: row.nickname,
                registertime: row.registertime,
            };

            var query = "select sum((select point from challenges where challenges.no = solvers.no)) as point from solvers where email = ?";

            conn.query(query, [row.email], function(err, rows) {
                console.log(rows);
                if (rows.point === null) {
                    user.point = 0;
                }
            });

        }
    });

    var query = "select email, (select point from challenges where no = 1) from solvers";
    
    res.render('./rank');
});





// 관리자 페이지
// - 일부러 어드민 페이지 게싱 못하게 하려고 이런 naming 한 것 죄송합니다
route.get('/secretjuju', function(req, res){

    res.render('./admin');
});

// 문제 관리하는 페이지
// 2018.05.18 00:39 정상 작동 확인
route.get('/secretjuju/challenge', function(req, res) {
    var challenges = [];
    var categorys = [];

    new Promise(function(resolve, reject) {
        // 문제 분야들 갖고 옴
        var query = "select `category` from `challenges` group by `category`";
        conn.query(query, function(err, rows){
            if (err)
                res.status(500).json({"status_code": 500, "status_message": "internal server error"});
            else 
                resolve(rows);
        });
    }).then(function(rows) {
        for (var i = 0; i < rows.length; i++) {
            categorys.push(rows[i].category);
        }
        // return categorys;
    });

    // DB에 있는 문제들을 템플릿을 이용해서 출력함
    new Promise(function(resolve, reject) {
        var query = "SELECT * FROM `challenges`";
        conn.query(query, function(err, rows) {
            if (err) {
                res.status(500).json({ "status_code": 500, "status_message": "internal server error" });
            } else {
                var categorys = [];
                for (var i = 0; i < rows.length; i++) {
                    var challenge = {
                        'no': rows[i].no,
                        'title': rows[i].title,
                        'point': rows[i].point,
                        'category': rows[i].category,
                        'description': rows[i].description,
                        'author': rows[i].author,
                        'solvers': rows[i].solvers,
                        'flag': rows[i].flag
                    };
                    challenges.push(challenge);
                }
                resolve(challenges);
            }
        });
    }).then(function(challenges) {
        res.render('./admin_chall_list', { 'challenges': challenges, 'categorys': categorys });
    });    
});

// 문제 수정 페이지
// 2018.05.18 11:03 정상 작동 확인
route.get('/secretjuju/challenge/:no', function(req, res) {
    // DB에서 빼온 값을 저장하기 위한 변수 선언
    no = Number(req.params.no);
    console.log("[*] Admin access to " + no);
    var files = [];

    new Promise(function(resolve, reject) {
        fs.readdir('uploads/' + no, function(err, items) {
            // console.log(items);
            console.log("[*] readdir ./uploads/" + no);
            resolve(items);
        });
    }).then(function(items) {
        files = items;
    });

    new Promise(function(resolve, reject) {
        
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
    }).then(function(challenge) {
        res.render('admin_chall_view', challenge);
        // console.log({ no: no, title: title, description: description });
    });
});

// 파일업로드 기능 추가 
// 2018.05.21 정상 작동 확인
route.post('/secretjuju/challenge/:no', function(req, res) {
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

    console.log('[*] hidden : ' + hidden);
    var query = "update `challenges` set title = ?, category = ?, author = ?, description = ?, files = ?, hidden = ? ";
    query += "where no = ?";

    new Promise(function(resolve, reject) {
        conn.query(query, [title, category, author, description, no, fileList.join("|"), hidden]);
        resolve();
    }).then(function() {
        res.send("<script>alert('modify ok');location.href='/secretjuju/challenge';</script>");
    });
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

route.get('/secretjuju/createChallenge', function(req, res) {
    res.render('admin_chall_create');
});

route.post('/secretjuju/createChallenge', function(req, res) {

    var filepath = "";

    var title = req.body.title;
    var category = req.body.category;
    var author = req.body.author;
    var description = req.body.description;
    var flag = req.body.flag;

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
        query += "(title, point, category, description, author, solvers, flag, files) ";
        query += "values (?, 0, ?, ?, ?, 0, ?, ?) ";
    
        // console.log(query);
        // console.log([title, category, description, author, flag, fileList]);
    
        conn.query(query, [title, category, description, author, flag, fileList], function(err, rows) {
            if (err){
                throw err;
            }
        });
    });


    res.send("<script>alert('Publish ok');location.href='/secretjuju/challenge';</script>");
});

// 페이크용 관리자 페이지
route.get('/admin', function(req, res) {
    res.send("admin page? just guessing plz lol (grin)");
});

var server = app.listen(port, function() {
    console.log("[*] H3X0R CTF Server Start.");
});
