const Sequelize = require('sequelize');
const API = require('./config.js');

class ChallengeAPI {
    constructor() { this.API = API }
    async getByNo(no) { return await API.Challenges.findOne({where: {no: no}}) }
    async getByTitle(title) { return await API.Challenges.findOne({where: {title: title}}) }
    async getByAuthor(author) { return await API.Challenges.findAll({where: {nickname: nickname}}) }
    async getPointByNo(no) { return await API.Challenges.findOne({attributes: ['no'], where: {no: no}}) }
    async getChalls() { return await API.Challenges.findAll({where: {hidden: 0}}) }
    async getAllChalls() { return await API.Challenges.findAll() }
    async getCategory() { return await API.Challenges.findAll({attributes: ['category'], where: {hidden: 0}, group: ['category'], order: [['category', 'desc']]}) }
    async getAllCategorys() { return await API.Challenges.findAll({attributes: ['category'], group: ['category'], order: [['category', 'desc']]}) }
    async getNumberOfSolver(challenge_no) { return await API.Solvers.count({where: {challenge_no: challenge_no}}) }
    async isSolvedChall(challenge_no, user_no) { return await API.Solvers.count({where: {challenge_no:challenge_no, user_no: user_no}}) }
    async getFlagByNo(chall_no) { return await API.Challenges.findOne({attributes: ['flag'], where: {no: chall_no}}) }
    async getTitleByNo(chall_no) { return await API.Challenges.findOne({attributes: ['title'], where: {no: chall_no}}) }
    async getSolvedLog(chall_no, user_no) { return await API.Solvers.findOne({where: {challenge_no: chall_no, user_no: user_no}}) }
    async getCurrentChall() { return await API.Challenges.findOne({order: [['no', 'desc']], limit: 1}); }
    async deleteChall(chall_no) { return await API.Challenges.destroy({where: {no: chall_no}}) }
    async getSolvedUsers(chall_no) { return await API.query("select * from solvers where challenge_no = :chall_no and (select admin from users where no = solvers.user_no) = 0", { replacements: { chall_no: chall_no}, type: Sequelize.QueryTypes.SELECT }); }
    async createChallenge(title, author, category, description, flag, hidden) {
        return await API.Challenges.create({title: title, author: author, category: category, description: description, flag: flag, hidden: hidden, point: 500 });
    }
    async updateChallenge(chall_no, title, author, category, description, flag, hidden) {
        return await API.Challenges.update({ title: title, author: author, category: category, description: description, flag: flag, hidden: hidden}, { where: { no: chall_no } });
    }
    async setPoint(chall_no, point) { return await API.Challenges.update({point: point}, {where: {no: chall_no}}) }
}

/*
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
 */

module.exports = new ChallengeAPI();
