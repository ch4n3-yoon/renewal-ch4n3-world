var crypto = require("crypto");
var conn = require("./dbconnect").conn;
var fs = require("fs");

module.exports = {
    sha512: function(str) {
        return crypto.createHash('sha512').update(str).digest('hex');
    },
    error: function(err) {
        if (err) {
            res.status(500).json({ "status_code": 500, "status_message": "internal server error" });
        }
    },
    replaceAll: function(str, searchStr, replaceStr) {
        return str.split(searchStr).join(replaceStr);
    },

    getFiles: (no) => {
        return new Promise(async (resolve, reject) => {

            if (no === NaN) {
                resolve(-1);
                return;
            }

            var files;
            var path = 'uploads/' + no;

            await fs.stat(path, (err, stats) => {
                // No such file or directory
                if (err && err.errno === 34) {
                    resolve(-1);
                    return;
                }
            });

            fs.readdir(path, async (err, files) => {
                resolve(files);
            });
        });
    },

};
