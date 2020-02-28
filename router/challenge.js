const express = require('express');
const fs = require('fs');
const router = express.Router();

const lib = require('../lib.js');

const API = require('../api/challenge');
const userAPI = require('../api/user');
const solversAPI = require('../api/Solvers');
const logAPI = require('../api/log');
const FUNC = require('../api/function');

const __admin_path__ = require('../config/serverConfig').adminPath;

let readDir = async (path, callback) => {
    await fs.readdir(path, async (err, files) => {
        if (err)
            throw err;
        callback(files);
    });
};

router.use(async (req, res, next) => {
    if (req.session.email)
        next();
    else
        res.redirect('/login');
});

router.get('/', async (req, res) => {

    let getSolvers = async (chall_no) => {
        return await API.getTheNumberOfSolvers(chall_no);
    };

    let getChallenges = async (user_no) => {
        let sqlData = await API.getChalls();
        let challenges = [];

        for (let i = 0; i < sqlData.length; i++)
            challenges.push(sqlData[i].dataValues);

        for (let i = 0; i < challenges.length; i++)
        {
            let chall_no = challenges[i].no;
            challenges[i].isSolvedChall = await isSolvedChallenge(chall_no, user_no);
            challenges[i].solvers = await getSolvers(chall_no);
            challenges[i].firstblood = await getFirstBlood(chall_no);
            challenges[i].files = await fs.readdirSync(`./public/uploads/${chall_no}/`);
        }

        return challenges;
    };

    let isSolvedChallenge = async (chall_no, user_no) => {
        return await API.isSolvedChallenge(chall_no, user_no);
    };

    let getUserByUserNo = async (user_no) => {
        let sqlData = await userAPI.getByNo(user_no);
        if (sqlData)
            return sqlData.dataValues;
        return null;
    };

    let getFirstBlood = async (challenge_no) => {
        let sqlData = await API.getFirstBlood(challenge_no);
        if (sqlData) {
            let user_no = sqlData.user_no;
            let user = await getUserByUserNo(user_no);
            return {user_no: user.no, nickname: user.nickname};
        }
        return null;
    };


    let main = async () => {

        if (!FUNC.isLogin(req, res))
            return;

        let user_no = req.session.user_no;
        let challenges = await getChallenges(user_no);

        res.render('challenges', {challenges: challenges, session: req.session, __admin_path__: __admin_path__});
    };

    await main();
});


module.exports = router;

