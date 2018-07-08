var express = require('express');
var router = express.Router();

var lib = require('../lib.js');
var conn = require("../dbconnect.js").conn;

// 랭킹 페이지
// 2018.06.06 17:18 정상 작동 확인
router.get('/', async (req, res) => {

    var getUsers = async () => {
        return new Promise(async (resolve, reject) => {

            var query = "select *, ";
            query += "(select sum((select point from challenges where challenges.no = solvers.solvedno)) from solvers where email = users.email) as point, ";
            query += "(select solvetime from solvers where email = users.email order by solvetime desc limit 1) as lastsolvetime ";
            query += "from users where admin = 0 order by point desc, lastsolvetime asc ";

            var queryResult = conn.query(query, (err, rows) => {
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

    var setUsers = (rows) => {
        return new Promise( (resolve, reject) => {

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

    var main = () => {
        return new Promise(async (resolve, reject) => {

            var users = await getUsers();
            var users = await setUsers(users);

            res.render('./rank', {users: users, isLogin: isLogin()});

            resolve();

        });
    };

    main();

});


module.exports = router;
