const fs = require('fs');
const moment = require('moment');
const lib = require('../lib');

exports.log_sequelize = (msg) => {
    let currTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    let text = `[${currTime}] ${msg}`;
    if (!fs.existsSync('./logs')){
        fs.mkdirSync('logs');
    }
    fs.appendFile('./logs/sequelize.log', text + '\n', 'utf8', (err) => {
        if (err)
            console.log(err.message);
    });
};

exports.isLogin = (req, res) => {
    if (!req.session.email) {
        let message = lib.setMessage("이 페이지에 접속하기 위해선 로그인이 필요합니다.", '/login');
        res.send(message);
        return 0;
    }
    return 1;
};

exports.isAdmin = (req, res) => {
    let admin = req.session.admin;
    if (!admin) {
        let message = lib.setMessage("이 페이지에선 관리자 권한이 필요합니다.", '/login');
        res.send(message);
        return 0;
    }
    return 1;
};

exports.readDir = async (path) => {
    return await fs.readdirSync(path);
};

exports.makeDir = async (path) => {
    if (!await fs.existsSync(path))
        return await fs.mkdirSync(path);
    else
        return null;
};

exports.removeFile = async (chall_no, filename) => {
    filename = filename.replace('..', '');
    filename = filename.replace('/', '');
    let filepath = `./public/uploads/${chall_no}/${filename}`;
    return await fs.unlink(filepath, (err) => {
        if (err) throw err;
    });
};