const express = require('express');
const router = express.Router();

const lib = require('../lib.js');
const conn = require("../dbconnect.js").conn;

// 랭킹 페이지
// 2018.06.06 17:18 정상 작동 확인
router.get('/', async (req, res) => {

    let getUsers = async () => {
        return new Promise(async (resolve, reject) => {

            let query =
                "select *, " +
                    "(select " +
                        "sum((select point from challenges where challenges.no = solvers.challenge_no)) " +
                    "from solvers where user_no = users.no) as point, " +
                    "(select solve_time from solvers where user_no = users.no order by solve_time desc limit 1) as lastsolvetime " +
                "from users where admin = 0 order by point desc, lastsolvetime asc";

            await conn.query(query, (err, rows) => {
                console.log(rows);
                resolve(rows);
            });
        });
    };


    let isLogin = () => {
        if (req.session.email)
            return 1;
        else
            return 0;
    };

    let setUsers = (rows) => {
        return new Promise( (resolve, reject) => {

            // point 가 null 값을 갖고 있다면 0으로 바꾼다.
            // lastsolvetime 이 null 이라면 'not yet'으로 바꾼다.
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].point === null)
                    rows[i].point = 0;

                if (rows[i].lastsolvetime === null)
                    rows[i].lastsolvetime = '😪';

            }

            resolve(rows);

        });
    };

    let main = async () => {
        let users = await getUsers();
        users = await setUsers(users);

        res.render('./rank', {users: users, isLogin: isLogin(), session: req.session});
    };

    await main();

});


module.exports = router;
