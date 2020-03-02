const express = require('express');
const router = express.Router();

const lib = require('../lib.js');
const FUNC = require('../api/function');
const config = require('../config/serverConfig');
const __admin_path__ = config.adminPath;


const API = require('../api/user');
const ChallengeAPI = require('../api/challenge');
const SolversAPI = require('../api/Solvers');
const LogAPI = require('../api/log');

const userService = require('../services/userService');


let login = async (email, password) => {
    let sqlData = await API.login(email, password);
    if (sqlData)
        return sqlData.dataValues;
    return 0;
};


let register = async (email, password, nickname) => {
    await API.createUser(email, password, nickname);
};


router.get('/', function(req, res) {
    res.render('index', {session: req.session, __admin_path__: __admin_path__});
});


router.get('/login', function(req, res) {
    res.render('login.pug');
});

router.post('/login', async (req, res) => {

    let status = await userService.Signin(req.body, req.session);
    if (status.error) {
        return res.send(lib.setMessage(status.message, 'back'));
    }

    res.redirect('/challenge');
});

router.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});

router.get('/register', function(req, res) {
    res.render('register.pug');
});

router.post('/register', async (req, res) => {

    let status = await userService.Signup(req.body);
    const userModel = status.userModel;

    if (status.error) {
        // TODO: logger 사용해서 에러 로그 남기기
    }

    res.send(lib.setMessage(status.message, 'back'));

});

router.post('/auth', async (req, res) => {
    let getChallengeByFlag = async (flag) => {
        let sqlData = await ChallengeAPI.getChallengeByFlag(flag);
        if (sqlData)
            return sqlData.dataValues;
        return null;
    };

    let isSolvedChallenge = async (challenge_no, user_no) => {
        return await SolversAPI.isSolvedChallenge(challenge_no, user_no);
    };

    let insertAuthLog = async (challenge_no, user_no, user_flag, state) => {
        return await LogAPI.insertAuthLog(challenge_no, user_no, user_flag, state);
    };

    let insertIntoSolvers = async (challenge_no, user_no) => {
        return SolversAPI.addSolver(challenge_no, user_no);
    };


    let main = async () => {

        if (!req.session.email)
            return res.json({status: 'not signed in'});

        let user_flag = req.body.flag;
        let user_no = req.session.user_no;
        let challenge = await getChallengeByFlag(user_flag);

        // json으로 return하기 위한 변수
        let result = {};

        if (challenge) {
            let challenge_no = challenge.no;
            result.challenge = challenge;

            if (await isSolvedChallenge(challenge.no, user_no)) {
                result.status = 'already solved';
                await insertAuthLog(challenge_no, user_no, user_flag, "ALREADY SOLVED");
            }

            else {
                result.status = 'solved';
                await insertIntoSolvers(challenge_no, user_no);
                await insertAuthLog(challenge_no, user_no, user_flag, "CORRECT");
            }
        }

        else {
            result.status = 'invalid_flag';
            await insertAuthLog(0, user_no, user_flag, "WRONG");
        }

        return res.json(result);
    };

    await main();
});


module.exports = router;

