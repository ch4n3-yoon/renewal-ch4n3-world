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
    async getFlagByNo(no) { return await API.Challenges.findOne({attributes: ['flag'], where: {no: no}}) }
    async getTitleByNo(no) { return await API.Challenges.findOne({attributes: ['title'], where: {no: no}}) }
    async getSolvedLog(chall_no, user_no) { return await API.Solvers.findOne({where: {challenge_no: chall_no, user_no: user_no}}) }
    async getCurrentChall() { return await API.Challenges.findOne({order: [['no', 'desc']], limit: 1}); }
    async removeChall(chall_no) { return await API.Challenges.destroy({where: {no: chall_no}}) }
    async createChallenge(title, author, category, description, flag, hidden) {
        return await API.Challenges.create({title: title, author: author, category: category, description: description, flag: flag, hidden: hidden, point: 500 });
    }
    async updateChallenge(no, title, author, category, description, flag, hidden) {
        return await API.Challenges.update({ title: title, author: author, category: category, description: description, flag: flag, hidden: hidden}, { where: { 'no': no } });
    }
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
