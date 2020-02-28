const Sequelize = require('sequelize');
const mysql = require("mysql");
const FUNC = require('./function');
const dotenv = require('dotenv');
dotenv.config();

const API = new Sequelize(process.env.DB, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        charset: 'utf8mb4_bin',
        collate: 'utf8mb4_bin',
        timestamps: true
    },
    operatorsAliases: false,
    timezone: '+09:00',
    logging: FUNC.log_sequelize,
    charset: 'utf8mb4'
});


API.Users = API.define('users', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    email: { type: Sequelize.TEXT('tiny'), allowNull: false },
    password: { type: Sequelize.TEXT('tiny'), allowNull: false },
    nickname: { type: Sequelize.TEXT('tiny'), allowNull: false },
    admin: { type: Sequelize.BOOLEAN, defaultValue: 0 },
},{charset: 'utf8',collate: 'utf8mb4_bin'});


API.Challenges = API.define('challenges', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    title: { type: Sequelize.STRING, allowNull: false },
    category: { type: Sequelize.STRING, allowNull: false },
    description: { type: Sequelize.TEXT, allowNull: false },
    flag: { type: Sequelize.STRING, allowNull: false },
    point: { type: Sequelize.INTEGER, allowNull: false },
    hidden: { type: Sequelize.BOOLEAN, defaultValue: 0 },
},{charset: 'utf8',collate: 'utf8mb4_bin'});


API.Solvers = API.define('solvers', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    challenge_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    solve_time: Sequelize.DATE,
},{charset: 'utf8',collate: 'utf8mb4_bin'});


API.Authlog = API.define('authlog', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    challenge_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_flag: { type: Sequelize.STRING },
    state: { type: Sequelize.ENUM('CORRECT', 'WRONG', 'ALREADY SOLVED'), allowNull: false },
    try_time: Sequelize.DATE
},{charset: 'utf8',collate: 'utf8mb4_bin'});

API.sync();


let conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB
});

conn.connect();

module.exports = {API: API, conn: conn};