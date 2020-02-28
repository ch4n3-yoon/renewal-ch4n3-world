const express = require('express');
const router = express.Router();

const lib = require('../lib.js');
const __admin_path__ = require('../config/serverConfig').adminPath;

const UserAPI = require('../api/user');


// 랭킹 페이지
// 2018.06.06 17:18 정상 작동 확인
router.get('/', async (req, res) => {

    let getUsers = async () => {
        return await UserAPI.rank();
    };

    let setUsers = async (rows) => {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].point === null)
                rows[i].point = 0;

            if (rows[i].lastsolvetime === null) {
                let emoji = ['😪', '🏄', '🐟', '👏', '👽', '💤', '💸'];
                let min = 0, max = emoji.length - 1;
                let random = Math.floor(Math.random() * (max - min + 1)) + min;
                rows[i].lastsolvetime = emoji[random];
            }

            else
                rows[i].lastsolvetime = await lib.DateToMySQLKSTDatetime(rows[i].lastsolvetime);
        }
        return rows;
    };

    let main = async () => {
        let users = await getUsers();
        users = await setUsers(users);

        res.render('./rank', {users: users, session: req.session, __admin_path__: __admin_path__});
    };

    await main();

});

module.exports = router;
