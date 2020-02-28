const crypto = require("crypto");
const conn = require("./api/config").conn;
const fs = require("fs");

module.exports = {
    sha512: function(str) {
        return crypto.createHash('sha512').update(str).digest('hex');
    },

    setMessage: (message, location = null) => {
        let result = '<script>';
        if (message)
            result += `alert('${message}');`;

        if (location === 'back')
            result += `history.back();`;
        else if (location)
            result += `location.href='${location}';`;
        result += '</script>';
        return result;
    },

    DateToMySQLKSTDatetime: async (datetime) => {
        function twoDigits(d) {
            if (0 <= d && d < 10) return "0" + d.toString();
            if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
            return d.toString();
        }

        Date.prototype.toMysqlFormat = function () {
            return this.getFullYear() + "-" + twoDigits(1 + this.getMonth()) + "-" + twoDigits(this.getDate())
                + " " + twoDigits(this.getHours()) + ":" + twoDigits(this.getMinutes()) + ":" + twoDigits(this.getSeconds());
        };

        let date = new Date(datetime);
        return date.toMysqlFormat();
    },

    convertDatetimeToTimestamp: async (datetime) => {
        let time = new Date(datetime);
        return time.getTime();
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

            let files;
            let path = `./public/uploads/${no}`;

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
    login: (email, password, fn) => {
        var query = "select * from users where email = ? and password = ? ";
        var sqlResult = conn.query(query, [email, password], (err, rows) => {
            if (rows.length === 0)
                fn(0);
            else
                fn(rows[0]);
        });
    }

};
