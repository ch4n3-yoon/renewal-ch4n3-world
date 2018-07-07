var express = require('express');
var router = express.Router();

var lib = require('../lib.js');
var conn = require('../dbconnect.js').conn;

router.get('/:no', async (req, res) => {

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

});


module.exports = router;
