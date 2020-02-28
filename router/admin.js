const express = require('express');
const fs = require('fs');
const os = require('os');

const router = express.Router();

const lib = require('../lib.js');
const conn = require('../api/config').conn;
const config = require('../config/serverConfig');

const API = require('../api/challenge');
const solversAPI = require('../api/Solvers');
const logAPI = require('../api/log');
const userAPI = require('../api/user');
const FUNC = require('../api/function');

const __admin_path__ = config.adminPath;

/*
    관리자 페이지
     - 문제 추가 / 수정 기능
     - 사용자 수정 기능
     - 문제 파일 업로드 및 삭제 기능
     - flag auth log 체크 기능
*/

router.use(async (req, res, next) => {
    if (req.session.admin)
        next();
    else
        res.redirect('/login');
});

router.get('/', async (req, res) => {

    let main = async () => {
        res.render('admin', {__admin_path__: __admin_path__});
    };

    await main();

});

router.get('/serverInfo', async (req, res) => {

    let main = async () => {
        let js_version = process.version;
        let os_name = os.platform();
        let os_version = os.release();

        let offset= -(new Date()).getTimezoneOffset();
        let timezone = (offset>=0 ? '+':'-') + parseInt(offset/60) + ':' + offset%60;

        return res.render('admin/server_information', {os: os_name, os_version:os_version, js_version: js_version, timezone: timezone});
    };

    await main();
});


// 문제 관리하는 페이지
// 2018.05.18 00:39 정상 작동 확인
router.get('/challenge', async (req, res) => {

    let getSolvers = async (chall_no) => {
        return await API.getNumberOfSolver(chall_no);
    };

    let getChallenges = async () => {
        let sqlData = await API.getAllChalls();
        let challenges = [];
        for (let i = 0; i < sqlData.length; i++)
        {
            challenges.push(sqlData[i].dataValues);
        }

        for (let i = 0; i < challenges.length; i++)
        {
            challenges[i].solvers = await getSolvers(challenges[i].no);
        }

        return challenges;
    };

    let getCategorys = async () => {
        let sqlData = await API.getAllCategorys();
        let categorys = [];
        for (let i = 0; i < sqlData.length; i++)
        {
            categorys.push(sqlData[i].dataValues.category);
        }

        return categorys;
    };

    let main = async () => {

        let challenges = await getChallenges();
        let categorys = await getCategorys();

        res.render('admin/admin_chall_list', { 'challenges': challenges, 'categorys': categorys, __admin_path__: __admin_path__});
    };

    await main();

});

// 문제 수정 페이지
// 2018.05.18 11:03 정상 작동 확인
// 2018.08.23 13:49 정상 작동 확인
router.get('/challenge/:chall_no', async (req, res) => {

    let getChallenge = async (chall_no) => {
        let result = await API.getByNo(chall_no);

        if (!result)
            return 0;
        return result.dataValues;
    };

    let main = async () => {

        let chall_no = Number(req.params.chall_no);
        let challenge = await getChallenge(chall_no);
        if (!challenge) {
            let message = lib.setMessage("잘못된 접근입니다.", '/');
            return res.send(message);
        }


        let path = `./public/uploads/${chall_no}/`;
        challenge.files = await FUNC.readDir(path);

        res.render('admin/admin_chall_view', {challenge: challenge, __admin_path__: __admin_path__});
    };

    await main();
});


// 파일업로드 기능 추가
// 2018.05.21 정상 작동 확인
// 2018.08.23 15:05 정상 작동 확인
router.post('/challenge/:challenge_no', async (req, res) => {

    let uploadFiles = async (path, files) => {
        if (!files)
            return;

        if (typeof files.length === 'undefined') {
            files = [files];
        }

        for (let i = 0; i < files.length; i++)
        {

            files[i].mv(path + files[i].name, (err) => {
                if (err)
                    throw err;
            });
        }
    };


    let updateChallenge = async (chall_no, title, category, description, flag, hidden, point) => {
        return await API.updateChallenge(chall_no, title, category, description, flag, hidden, point);
    };


    let main = async () => {
        let challenge_no = req.params.challenge_no;
        let path = `./public/uploads/${challenge_no}/`;

        let title = req.body.title;
        let category = req.body.category;
        let description = req.body.description;
        let flag = req.body.flag;
        let point = req.body.point;

        let hidden = 0;
        if (req.body.hidden)
            hidden = 1;

        description = lib.replaceAll(description, "\r\n", "\n");

        let files = req.files['file[]'];

        uploadFiles(path, files);
        updateChallenge(challenge_no, title, category, description, flag, hidden, point);

        let message = lib.setMessage("수정이 완료되었습니다.", `/${__admin_path__}/challenge`);
        res.send(message);
    };

    main();

});


router.get('/challenge/:no/open', async (req, res) => {

    let main = async () => {
        let no = Number(req.params.no);
        await API.openChallenge(no);

        let title = await API.getTitleByNo(no);
        let meessage = lib.setMessage(`${title} 문제가 공개되었습니다`, 'back');
        return res.send(message);
    };

    await main();
});


// 정말로 문제를 삭제하시겠습니까?
router.get('/challenge/:no/realrudaganya', async (req, res) => {

    let main = async () => {
        let no = Number(req.params.no);

        res.send(`
        <script>
            alert('문제를 삭제하면 해당 문제를 푼 사용자의 점수가 깎입니다. 진행하시겠습니까?');
            let result = confirm('ㄹㅇ루 삭제하시겠습니까?');
            if (result) {
                location.href = '/${__admin_path__}/challenge/${no}/delete';
            }

            else {
                history.back();
            }
        </script>
        `);
    };

    await main();
});

// 문제 삭제 코드
router.get('/challenge/:challenge_no/delete', async (req, res) => {

    // challenges 테이블에서 해당 chall을 삭제함.
    let deleteChallenge = async (chall_no) => {
        return await API.deleteChall(chall_no);
    };

    // solvers 테이블에서 해당 Solve Logs를 삭제함
    let deleteSolveLog = async (chall_no) => {
        return await solversAPI.removeSolveLog(chall_no);
    };

    let main = async () => {
        let challenge_no = Number(req.params.challenge_no);
        await deleteChallenge(challenge_no);
        await deleteSolveLog(challenge_no);

        let message = lib.setMessage('successfully deleted', `/${__admin_path__}/challenge`);
        return res.send(message);
    };

    await main();
});


router.get('/challenge/:no/deletefile/:filename', async (req, res) => {

    let chall_no = req.params.no;
    let filename = req.params.filename;

    let main = async () => {
        FUNC.removeFile(chall_no, filename);
        res.send(`<script>
                        alert('File deleted successfully');
                        location.href = '/${__admin_path__}/challenge/${chall_no}';
                    </script>`);
    };

    await main();

});

router.get('/createChallenge', async (req, res) => {

    let main = async () => {
        res.render('admin/admin_chall_create', {__admin_path__: __admin_path__});
    };

    await main();

});

router.post('/createChallenge', async (req, res) => {

    let createChallenge = async (title, category, description, flag, hidden, point) => {
        return await API.createChallenge(title, category, description, flag, hidden, point);
    };

    let getCurrentChallenge = async () => {
        let sqlData = await API.getCurrentChall();
        return sqlData.dataValues;
    };

    let uploadFiles = async (path, files) => {
        if (!files)
            return;

        if (typeof files.length === 'undefined') {
            files = [files];
        }

        for (let i = 0; i < files.length; i++)
        {

            files[i].mv(path + files[i].name, (err) => {
                if (err)
                    throw err;
            });
        }
    };

    let main = async () => {

        let title = req.body.title;
        let category = req.body.category;
        let description = req.body.description;
        let flag = req.body.flag;
        let point = req.body.point;
        let hidden = 0;
        if (req.body.hidden)
            hidden = 1;
        let files = req.files['file[]'];

        await createChallenge(title, category, description, flag, hidden, point);
        let challenge = await getCurrentChallenge();
        let chall_no = challenge.no;
        let path = `./public/uploads/${chall_no}/`;
        await FUNC.makeDir(path);
        await uploadFiles(path, files);

        let message = lib.setMessage("성공적으로 문제가 등록되었습니다.", `/${__admin_path__}/challenge`);
        res.send(message);
    };

    await main();
});


// 틀린 플래그 인증 로그
router.get('/wrongkey', async (req, res) => {

    let getNickname = async (user_no) => {
        let sqlData = await userAPI.getNicknameByNo(user_no);
        if (!sqlData)
            return 0;
        return sqlData.dataValues.nickname;
    };

    let getTitle = async (chall_no) => {
        let sqlData = await API.getByNo(chall_no);
        if (sqlData)
            return sqlData.dataValues.title;
        return "undefined";
    };

    let getWrongAuthlog = async () => {
        let sqlData = await logAPI.getWrongLogs();
        let logs = [];
        for (let i = 0; i < sqlData.length; i++) {
            logs.push(sqlData[i].dataValues);
            logs[i].title = await getTitle(logs[i].challenge_no);
            logs[i].nickname = await getNickname(logs[i].user_no);
        }

        return logs;
    };

    let main = async () => {
        let logs =  await getWrongAuthlog();
        res.render('admin_wrongkey', {logs: logs});
    };

    await main();
});



// 맞은 플래그 인증 로그
router.get('/correctkey', async (req, res) => {

    let getNickname = async (user_no) => {
        let sqlData = await userAPI.getNicknameByNo(user_no);
        if (!sqlData)
            return 0;
        return sqlData.dataValues.nickname;
    };

    let getTitle = async (chall_no) => {
        let sqlData = await API.getByNo(chall_no);
        if (sqlData)
            return sqlData.dataValues.title;
        return "undefined";
    };

    let getWrongAuthlog = async () => {
        let sqlData = await logAPI.getCorrectLogs();
        let logs = [];
        for (let i = 0; i < sqlData.length; i++) {
            logs.push(sqlData[i].dataValues);
            logs[i].title = await getTitle(logs[i].challenge_no);
            logs[i].nickname = await getNickname(logs[i].user_no);
        }

        return logs;
    };

    let main = async () => {
        let logs =  await getWrongAuthlog();
        res.render('admin_correctkey', {logs: logs});
    };

    await main();

});



// 관리자의 사용자 관리 페이지
router.get('/user', async (req, res) => {

    let getUsers = async () => {
        return await userAPI.rankWithAdmin();
    };

    let setUsers = async (rows) => {

        for (let i = 0; i < rows.length; i++) {
            if (rows[i].point === null)
                rows[i].point = 0;

            if (rows[i].lastsolvetime === null)
                rows[i].lastsolvetime = '🏄';

            else {

                function twoDigits(d) {
                    if(0 <= d && d < 10) return "0" + d.toString();
                    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
                    return d.toString();
                }

                Date.prototype.toMysqlFormat = function () {
                    return this.getFullYear() + "-" + twoDigits(1 + this.getMonth()) + "-" + twoDigits(this.getDate())
                        + " " + twoDigits(this.getHours()) + ":" + twoDigits(this.getMinutes()) + ":" + twoDigits(this.getSeconds());
                };

                let date = new Date(rows[i].lastsolvetime);
                rows[i].lastsolvetime = date.toMysqlFormat();
            }
        }

        return rows;
    };

    let main = async () => {
        let users = await getUsers();
        users = await setUsers(users);
        res.render('admin/admin_user_list', {users: users, __admin_path__: __admin_path__});
    };

    await main();

});



router.get('/user/:no', async (req, res) => {

    let getUserByNo = async (user_no) => {
        let sqlData = await userAPI.getByNo(user_no);
        if (!sqlData)
            return 0;
        return sqlData.dataValues;
    };

    let main = async () => {
        let user_no = Number(req.params.no);
        let user = await getUserByNo(user_no);
        if (!user)
            return res.send(lib.setMessage('Invalid access', '/'));

        res.render('admin/admin_user_modify', {user: user, __admin_path__: __admin_path__});
    };

    await main();
});


router.post('/user/:no/modify', async (req, res) => {

    let updateUserWithoutPassword = async (user_no, email, nickname, admin) => {
        return await userAPI.updateUserWithoutPassword(user_no, email, nickname, admin);
    };

    let updateUserWithPassword = async (user_no, email, password, nickname, admin) => {
        return await userAPI.updateUserWithPassword(user_no, email, password, nickname, admin);
    };


    let main = async () => {
        let no = Number(req.params.no);
        let email = req.body.email;
        let nickname = req.body.nickname;
        let password = req.body.password;
        let admin = 0;

        if (req.body.admin)
            admin = 1;

        if (password) {
            password = lib.sha512(password);
            await updateUserWithPassword(no, email, password, nickname, admin);
        }

        else {
            await updateUserWithoutPassword(no, email, nickname, admin);
        }

        let message = lib.setMessage('Modifications completed', `/${__admin_path__}/user`);
        return res.send(message);
    };

    await main();
});

// 정말로 사용자를 삭제하시겠습니까?
router.get('/user/:no/realrudaganya', async (req, res) => {

    let main = async () => {
        let no = Number(req.params.no);

        return res.send(`<script>
                    let result = confirm('Are you sure?');
                    if (result) {
                        location.href = '/${__admin_path__}/user/${no}/delete';
                    }
        
                    else {
                        history.back();
                    }
                </script>`);
    };

    await main();
});


router.get('/user/:no/delete', async (req, res) => {

    let deleteUserByNo = async (user_no) => {
        return await userAPI.deleteUser(user_no);
    };

    let deleteUserSolvedLog = async (user_no) => {
        return await solversAPI.deleteUserSolvedLog(user_no);
    };


    let main = async () => {

        let user_no = Number(req.params.no);

        await deleteUserSolvedLog(user_no);
        await deleteUserByNo(user_no);

        let message = lib.setMessage('Successfully deleted', `/${__admin_path__}/user`);
        return res.send(message);
    };

    await main();
});


router.get('/serverSetting', async (req, res) => {

    

});

module.exports = router;
