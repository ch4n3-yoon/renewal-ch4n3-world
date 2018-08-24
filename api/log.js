const Sequelize = require('sequelize');
const API = require('./config.js');
const Op = Sequelize.Op;

class ChallengeAPI {
    constructor() { this.API = API }
    async getAllLogs() { return await API.Authlog.findAll({}) }
    async getWrongLogs() { return await API.Authlog.findAll({where: {state: 'WRONG'}, order: [['createdAt', 'desc']]}) }
    async getCorrectLogs() { return await API.Authlog.findAll({where: {state: {[Op.or]: ['CORRECT', 'ALREADY SOLVED']}}, order: [['createdAt', 'desc']] }) }
    async insertAuthLog(chall_no, user_no, user_flag, state) {
        return await API.Authlog.create({challenge_no: chall_no, user_no: user_no, user_flag: user_flag, state: state, try_time: Sequelize.fn('now')});
    }
}

/*
API.Authlog = API.define('authlog', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    challenge_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_flag: { type: Sequelize.STRING },
    state: { type: Sequelize.ENUM('CORRECT', 'WRONG'), allowNull: false },
    try_time: Sequelize.DATE
});
 */

module.exports = new ChallengeAPI();
