const express = require('express');
const router = express.Router();

const API = require('../api/challenge');
const userAPI = require('../api/user');
const solversAPI = require('../api/solvers');

router.get('/:no', async (req, res) => {

    let getTitle = async (chall_no) => {
        let sqlData = await API.getByNo(chall_no);
        if (sqlData)
            return sqlData.dataValues.title;
        return "undefined";
    };

    let getSolveRank = async (chall_no, user_no) => {
        let sqlData = await solversAPI.getSolvedTime(chall_no, user_no);
        if (!sqlData)
            return 0;
        let solve_time = sqlData.dataValues.solve_time;
        return await solversAPI.getSolvedRank(solve_time);
    };

    let getSolvedChallenges = async (user_no) => {
        let sqlData = await solversAPI.getSolvedChalls(user_no);
        let challenges = [];
        for (let i = 0; i < sqlData.length; i++)
            challenges.push(sqlData[i].dataValues);

        for (let i = 0; i < challenges.length; i++) {
            let chall_no = challenges[i].challenge_no;
            challenges[i].title = await getTitle(chall_no);
            challenges[i].rank = await getSolveRank(chall_no, user_no);
        }

        return challenges;
    };

    let getChallenegs = async () => {
        let sqlData = await API.getChalls();
        let challenges = [];
        for (let i = 0; i < sqlData.length; i++) {
            challenges.push(sqlData[i].dataValues);
        }

        return challenges;
    };

    let getNickname = async (user_no) => {
        let sqlData = await userAPI.getNicknameByNo(user_no);
        if (!sqlData)
            return 0;
        return sqlData.dataValues.nickname;
    };

    let main = async () => {
        let user_no = req.params.no;
        let solvedChallenges = await getSolvedChallenges(user_no);
        let challenges = await getChallenegs();
        let nickname = await getNickname(user_no);

        console.log({solvedChallenges: solvedChallenges, allChallenges: challenges, nickname: nickname});
        res.render('./user_info', {solvedChallenges: solvedChallenges, allChallenges: challenges, nickname: nickname});
    };

    await main();
});


module.exports = router;
