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

    getFiles: function(no) {
        var files;
        new Promise(function(resolve, reject) {
            fs.readdir('uploads/' + no, function(err, items) {
                // console.log(items);
                console.log("[*] readdir ./uploads/" + no);
                files = items;
            });
        }).then(function() {
            console.log(files);
        });
        
        return files;
    },
    
};