var crypto = require("crypto");
var conn = require("./dbconnect.js").conn;
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

    alert: (res, msg) => {
        return Promise(async (resolve, reject) => {
            var message = `<script>alert('${msg}'); history.back(); </script>`;
            res.send(message);
            res.end();
        });
    },

    // email과 nickname이 이미 존재하는지 확인하는 코드
    isUserInfoExist: (email, nickname, fn) => {

        var query = "select * from users where email = ? or nickname = ?";
        var sqlResult = conn.query(query, [email, nickname], (err, rows) => {

            // 중복된 계정 존재
            if (rows.length != 0) {
                fn(1);
            }

            fn(0);
        });

    },

    insertUser: (email, nickname, password) => {
        var query = "insert into users (email, nickname, password, registertime) "
        query += "values (?, ?, ?, now())";
        conn.query(query, [email, nickname, password], (err, rows) => {
            console.log("[+] " + nickname + " has inserted.");
        });
    },

    // 로그인에 사용되는 함수
    login: async (email, password, fn) => {
        var query = "select * from users where email = ? and password = ? ";
        var sqlResult = await conn.query(query, [email, password], (err, rows) => {
            if (rows.length === 0)
                fn(0);
            else
                fn(rows[0]);
        });
    }

};
