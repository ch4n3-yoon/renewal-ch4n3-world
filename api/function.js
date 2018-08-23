const fs = require('fs');
const moment = require('moment');

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
    //console.log(text)
};

exports.isLogin = (req, res) => {
    if (!req.session.email) {
        res.send(`<script>
                    alert('Sorry, this page needs your login');
                    location.href = '/login';
                </script>`);
        return 0;
    }

    return 1;
};

exports.readDir = async (path) => {
    return await fs.readdirSync(path);
};

exports.makeDir = async (path) => {
    return await fs.mkdirSync(path);
};

exports.removeFile = async (chall_no, filename) => {
    filename = filename.replace('..', '');
    filename = filename.replace('/', '');
    let filepath = `./public/uploads/${chall_no}/${filename}`;
    return await fs.unlink(filepath, (err) => {
        if (err) throw err;
    });
};