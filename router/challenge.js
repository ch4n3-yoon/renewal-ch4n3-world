const express = require('express');
const router = express.Router();
const fs = require('fs');

const lib = require('../lib.js');
const conn = require("../dbconnect.js").conn;

const API = require('../api/challenge');
const solversAPI = require('../api/solvers');
const logAPI = require('../api/log');
const FUNC = require('../api/function');


let readDir = async (path, callback) => {
    await fs.readdir(path, async (err, files) => {
        if (err)
            throw err;
        callback(files);
    });
};

router.get('/', async (req, res) => {

    let getCategorys = async () => {
        let sqlData = await API.getCategory();
        let categorys = [];
        for (let i = 0; i < sqlData.length; i++)
        {
            categorys.push(sqlData[i].dataValues.category);
        }
        return categorys;
    };

    let getSolvers = async (chall_no) => {
        let sqlData = await API.getNumberOfSolver(chall_no);
        return sqlData;
    };

    let getChallenges = async (user_no) => {
        let sqlData = await API.getChalls();
        let challenges = [];

        for (let i = 0; i < sqlData.length; i++)
            challenges.push(sqlData[i].dataValues);

        for (let i = 0; i < challenges.length; i++)
        {
            let chall_no = challenges[i].no;
            challenges[i].isSolvedChall = await isSolvedChall(chall_no, user_no);
            challenges[i].solvers = await getSolvers(chall_no);
        }

        return challenges;
    };

    let isSolvedChall = async (chall_no, user_no) => {
        let sqlData = await API.isSolvedChall(chall_no, user_no);
        return sqlData;
    };

    let main = async () => {

        if (!FUNC.isLogin(req, res))
            return;

        let user_no = req.session.user_no;

        let challenges = await getChallenges(user_no);
        let categorys = await getCategorys();

        res.render('chall_list.pug', { 'challenges': challenges, 'categorys': categorys });
    };

    main();

});


// 2018.08.22 20:22 정상 작동 확인
router.get('/:no', async (req, res) => {

    let getChallenge = async (no) => {
        let sqlData = await API.getByNo(no);
        return sqlData.dataValues;
    };

    let main = async () => {

        // if (!FUNC.isLogin(req, res))
        //     return;

        let no = Number(req.params.no);
        let challenge = await getChallenge(no);

        let path = `./public/uploads/${no}/`;
        challenge.files = await fs.readdirSync(path);

        if (!challenge || challenge.hidden === true) {
            console.log(`[x] ${req.session.nickname} has accessed invalid path (/challenge/${no})`);
            res.send("<script>alert('Invalid access detected'); history.back(); </script>");
            return -1;
        }

        res.render('./chall', challenge);
    };

    main();
});



// 플래그 인증 페이지
router.post('/:no/auth', async (req, res) => {

    let getFlag = async (chall_no) => {
        let sqlData = await API.getFlagByNo(chall_no);
        return sqlData.dataValues.flag;
    };

    let getTitle = async (chall_no) => {
        let sqlData = await API.getTitleByNo(chall_no);
        return sqlData.dataValues.title;
    };

    let getChallPoint = async (no) => {
        return new Promise(async (resolve, reject) => {

            var query = "select point from challenges where no = ?";
            var queryResult = conn.query(query, [no], async (err, rows) => {
                resolve(rows[0].point);
            });

        });
    };

    let setChallPoint = async (chall_no) => {
        // int(round(min_score + (max_score - min_score) / (1 + (max(0, solves - 1) / 4.0467890) ** 3.84 )))
        let solves = API.getNumberOfSolver(chall_no);
        let point = Number(Math.round(10 + (500 - 10)) / Math.pow((1 + Math.max(0, solves - 1) / 4.0467890),2) );
        return point;
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

    let isAreadySolve = async (chall_no, user_no) => {
        let sqlData = await API.isSolvedChall(chall_no, user_no);
        console.log(sqlData);
    };

    // solvers 테이블에 insert 함
    let insertIntoSolvers = async (chall_no, user_no) => {
        return solversAPI.addSolver(chall_no, user_no);
    };

    // authlog 테이블에 어떤 플래그를 입력했는지 insert 함
    // insertAuthLog(chall_no, user_no, user_flag, state)
    let getSolvedLog = async (chall_no, user_no) => {
        let sqlData = await API.getSolvedLog(chall_no, user_no);
        return sqlData.dataValues;
    };

    let insertAuthLog = async (chall_no, user_no, user_flag, state) => {
        return await logAPI.insertAuthLog(chall_no, user_no, user_flag, state);
    };

    let main = async () => {

        // if (!FUNC.isLogin(req, res))
        //     return;

        let user_no = req.session.user_no;
        let userFlag = req.body.flag;
        let email = req.session.email;

        let chall_no = Number(req.params.no);
        let flag = await getFlag(chall_no);

        console.log(flag);

        if (await isAreadySolve(chall_no, user_no)) {
            let logs = await getSolvedLog(chall_no, user_no);
            res.send("<script>alert('you\\\'ve already solved it'); history.back(); </script>");
            return console.log(logs);
        }

        if (flag === userFlag) {

            // insertIntoSolvers(no, email);       // solvers 테이블에 insert
            // decreasePoint(no);                  // challenges 에 있는 해당 문제에 -10 점을 함
            // insertIntoAuthlog(no, email, userFlag, 1);
            //                                     // authlog 테이블에 insert

            res.send(`<script>
                                alert('Correct flag!');
                                location.href = '/challenge';
                            </script>`);
            return res.end();
        }

        else {
            insertIntoAuthlog(no, email, userFlag, 0);
            res.send("<script>alert('wrong flag'); history.back(); </script>");
            res.end();
        }
    };



    main();

});

module.exports = router;
