const Sequelize = require('sequelize');
const API = require('./config.js').API;

class AdminAPI {
    constructor() { this.API = API }
    async get(no) { return await API.Challenges.findOne({where: {no: no}}) }
    async getByTitle(title) { return await API.Challenges.findOne({where: {title: title}}) }
    async getByAuthor(author) { return await API.Challenges.findAll({where: {nickname: nickname}}) }
    async getPointByNo(no) { return await API.Challenges.findOne({attributes: [no], where: {no: no}}) }
    async getCategory() { return await API.Challenges.findAll({attributes: ['category'], where: {hidden: 0}, group: ['category']}) }
    async getCategory() { return await API.Challenges.findAll({attributes: ['category']}) }
    async getNumberOfSolver(challenge_no) { return await API.Solvers.count({where: {challenge_no: challenge_no}}) }
    async isSolvedChall(challenge_no, user_no) { return await API.Solvers.count({where: {challenge_no:challenge_no, user_no: user_no}}) }
    async isSolvedChallenge(challenge_no, user_no) { return await API.Solvers.count({where: {challenge_no:challenge_no, user_no: user_no}}) }
}

module.exports = new AdminAPI();
