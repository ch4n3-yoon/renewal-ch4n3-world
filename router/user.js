const express = require('express');
const router = express.Router();

const API = require('../api/challenge');
const userAPI = require('../api/user');
const solversAPI = require('../api/Solvers');

const lib = require('../lib');

router.get('/:user_no', async (req, res) => {

    let getTitle = async (chall_no) => {
        let sqlData = await API.getByNo(chall_no);
        if (sqlData)
            return sqlData.dataValues.title;
        return "undefined";
    };

    let getSolvedRank = async (challenge_no, solve_time) => {
        return await solversAPI.getSolvedRank(chall_no, solve_time);
    };

    let getChallenegs = async () => {
        let sqlData = await API.getChalls();
        let challenges = [];
        for (let i = 0; i < sqlData.length; i++) {
            challenges.push(sqlData[i].dataValues);
        }

        return challenges;
    };

    let setUserSolvedInfo = async (user_no, challenges) => {
        for (let i = 0; i < challenges.length; i++) {
            let challenge_no = challenges[i].no;
            if (await solversAPI.isSolvedChallenge(challenge_no, user_no)) {
                challenges[i].solvedTime
                    = await lib.DateToMySQLKSTDatetime((await solversAPI.getSolvedTime(challenge_no, user_no)).dataValues.solve_time);
                challenges[i].solvedRank = await solversAPI.getSolvedRank(challenge_no, challenges[i].solvedTime);
            }

            else {
                challenges[i].solvedRank = null;
                let emoji = ['😪', '🏄', '🐟', '👏', '💤', '👽', '💸'];
                let min = 0, max = emoji.length - 1;
                let random = Math.floor(Math.random() * (max - min + 1)) + min;
                challenges[i].solvedTime = emoji[random];
            }
        }
        return challenges;
    };

    let getUserByUserNo = async (user_no) => {
        let sqlData = await userAPI.getByNo(user_no);
        if (sqlData)
            return sqlData.dataValues;
        return null;
    };

    let main = async () => {

        let user_no = req.params.user_no;
        let user = await getUserByUserNo(user_no);
        if (!user)
            return res.send(lib.setMessage('This user does not exist.', 'back'));

        let challenges = await getChallenegs();
        challenges = await setUserSolvedInfo(user_no, challenges);

        res.render('user_info', {challenges: challenges,
                                user: user,
                                session: req.session});
    };

    await main();
});


module.exports = router;
