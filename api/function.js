const fs = require('fs');
const moment = require('moment');

exports.log_sequelize = (msg) => {
    var currTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss")
    var text = `[${currTime}] ${msg}`
    fs.appendFile('./logs/sequelize.log', text + '\n', 'utf8', (err) => {
        if (err)
            console.log(err.message);
    });
    //console.log(text)
};