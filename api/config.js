const Sequelize = require('sequelize');
const CONF = require('../config/dbSetting');
const FUNC = require('./function');

const API = new Sequelize(CONF.database, CONF.user, CONF.password, {
    host: CONF.host,
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        charset: 'utf8mb4_bin',
        collate: 'utf8mb4_unicode_ci',
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
    register_time: Sequelize.DATE,
    admin: { type: Sequelize.BOOLEAN, defaultValue: 0 },
});


API.Challenges = API.define('challenges', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    title: { type: Sequelize.STRING, allowNull: false },
    author: { type: Sequelize.STRING, allowNull: false },
    category: { type: Sequelize.STRING, allowNull: false },
    description: { type: Sequelize.TEXT, allowNull: false },
    flag: { type: Sequelize.STRING, allowNull: false },
    point: { type: Sequelize.INTEGER, allowNull: false },
    hidden: { type: Sequelize.BOOLEAN, defaultValue: 0 },
});


API.Solvers = API.define('solvers', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    challenge_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    solve_time: Sequelize.DATE,
});


API.Authlog = API.define('authlog', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    challenge_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_flag: { type: Sequelize.STRING },
    state: { type: Sequelize.ENUM('CORRECT', 'WRONG', 'ALREADY SOLVED'), allowNull: false },
    try_time: Sequelize.DATE
});

API.sync();
module.exports = API;