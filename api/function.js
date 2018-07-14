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
                    history.back();
                </script>`);
        return 0;
    }

    return 1;
};