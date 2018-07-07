var mysql = require("mysql");
var config = require("./config/dbSetting.js");

var conn = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    port: config.port,
    database: config.database
});

conn.connect();

module.exports = {conn: conn};


/*
CREATE TABLE `users` ( `no` INT NOT NULL AUTO_INCREMENT , `email` VARCHAR(256) NOT NULL , `password` VARCHAR(256) NOT NULL , `nickname` VARCHAR(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL , `registertime` DATETIME NOT NULL , PRIMARY KEY (`no`)) ENGINE = MyISAM CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT = 'H3X0R CTF';
*/

/*
CREATE TABLE `challenges` ( `no` INT NOT NULL AUTO_INCREMENT , `title` VARCHAR(256) NOT NULL , `author` VARCHAR(256) NOT NULL , `category` VARCHAR(256) NOT NULL , `description` TEXT NOT NULL , `solvers` INT NOT NULL , `flag` VARCHAR(256) NOT NULL , `files` VARCHAR(256) NULL , PRIMARY KEY (`no`)) ENGINE = MyISAM CHARSET=utf8 COLLATE utf8_unicode_ci;
*/

/*
CREATE TABLE `solvers` ( `no` INT NOT NULL AUTO_INCREMENT , `solvedno` INT NOT NULL, `email` VARCHAR(256) NOT NULL , `solvetime` DATETIME NOT NULL , PRIMARY KEY (`no`)) ENGINE = MyISAM;
*/

/*
alter table challenges add hidden int not null default '0';
*/

/*
ALTER TABLE challenges ADD point int not null default 500 after files
*/

/*
CREATE TABLE `authlog` ( `no` INT NOT NULL AUTO_INCREMENT , `solvingno` INT NOT NULL , `email` VARCHAR(256) NOT NULL , `enteredflag` VARCHAR(256) NOT NULL , `state` INT NOT NULL , `trytime` DATETIME NOT NULL , PRIMARY KEY (`no`)) ENGINE = MyISAM CHARSET=utf8 COLLATE utf8_unicode_ci;
*/

/*
ALTER TABLE users ADD admin int not null default 0;
*/
