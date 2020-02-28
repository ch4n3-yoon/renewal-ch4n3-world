const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const API = require('./config.js').API;

class ChallengeAPI {
    constructor() { this.API = API }
    async getByNo(no) { return await API.Challenges.findOne({where: {no: no}}) }
    async getByTitle(title) { return await API.Challenges.findOne({where: {title: title}}) }
    async getPointByNo(no) { return await API.Challenges.findOne({attributes: ['no'], where: {no: no}}) }
    async getChalls() { return await API.Challenges.findAll({where: {hidden: 0}, order: [['point', 'asc']]}) }
    async getAllChalls() { return await API.Challenges.findAll() }
    async getCategory() { return await API.Challenges.findAll({attributes: ['category'], where: {hidden: 0}, group: ['category'], order: [['category', 'desc']]}) }
    async getAllCategorys() { return await API.Challenges.findAll({attributes: ['category'], group: ['category'], order: [['category', 'desc']]}) }
    async getNumberOfSolver(challenge_no) { return await API.Solvers.count({where: {challenge_no: challenge_no}, }) }
    async isSolvedChallenge(challenge_no, user_no) { return await API.Solvers.count({where: {challenge_no:challenge_no, user_no: user_no}}) }
    async getFlagByNo(chall_no) { return await API.Challenges.findOne({attributes: ['flag'], where: {no: chall_no, }}) }
    async getChallengeByFlag(flag) { return await API.Challenges.findOne({attributes: ['no', 'title', 'category', 'point'], where: {flag: flag}}) }
    async getTitleByNo(chall_no) { return await API.Challenges.findOne({attributes: ['title'], where: {no: chall_no}}) }
    async getSolvedLog(chall_no, user_no) { return await API.Solvers.findOne({where: {challenge_no: chall_no, user_no: user_no}}) }
    async getCurrentChall() { return await API.Challenges.findOne({order: [['no', 'desc']], limit: 1}) }
    async deleteChall(chall_no) { return await API.Challenges.destroy({where: {no: chall_no}}) }
    async getSolvedUsers(chall_no) { return await API.query("select * from solvers where challenge_no = :chall_no and (select admin from users where no = solvers.user_no) = 0", { replacements: { chall_no: chall_no}, type: Sequelize.QueryTypes.SELECT }); }
    async getTheNumberOfSolvers(chall_no) { return (await API.query("select count(*) as `solvers` from solvers where challenge_no = :chall_no and (select admin from users where no = solvers.user_no) = 0", { replacements: { chall_no: chall_no}, type: Sequelize.QueryTypes.SELECT }))[0].solvers;}
    async createChallenge(title, category, description, flag, hidden, point = 1000) {
        return await API.Challenges.create({title: title, category: category, description: description, flag: flag, hidden: hidden, point: point });
    }
    async updateChallenge(chall_no, title, category, description, flag, hidden, point) {
        return await API.Challenges.update({ title: title, category: category, description: description, flag: flag, hidden: hidden, point: point}, { where: { no: chall_no } });
    }
    async openChallenge(chall_no) {
        return await API.Challenges.update({hidden: true, open_time: Sequelize.fn('now')}, {where: {no: chall_no}});
    }
    async closeChallenge(chall_no) { return await API.Challenges.update({hidden: false}, {where: {no: chall_no}}); }
    async setPoint(chall_no, point) { return await API.Challenges.update({point: point}, {where: {no: chall_no}}) }

    async getFirstBlood(challenge_no) {
        let sqlData = await API.query(
            "select * from solvers " +
            "where challenge_no = ? " +
            "and (select admin from users where users.no = solvers.user_no) = 0 limit 1",
            { replacements: [ challenge_no ], type: Sequelize.QueryTypes.SELECT });
        return sqlData[0];
    }

}

module.exports = new ChallengeAPI();
