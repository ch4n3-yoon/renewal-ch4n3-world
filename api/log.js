const Sequelize = require('sequelize');
const API = require('./config.js').API;
const Op = Sequelize.Op;

class logAPI {
    constructor() { this.API = API }
    async getAllLogs() { return await API.Authlog.findAll({}) }
    async getWrongLogs() { return await API.Authlog.findAll({where: {state: 'WRONG'}, order: [['createdAt', 'desc']]}) }
    async getCorrectLogs() { return await API.Authlog.findAll({where: {state: {[Op.or]: ['CORRECT', 'ALREADY SOLVED']}}, order: [['createdAt', 'desc']] }) }
    async insertAuthLog(chall_no, user_no, user_flag, state) {
        return await API.Authlog.create({challenge_no: chall_no, user_no: user_no, user_flag: user_flag, state: state, try_time: Sequelize.fn('now')});
    }
}

module.exports = new logAPI();
