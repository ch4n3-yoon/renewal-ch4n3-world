const Sequelize = require('sequelize');
const API = require('./config.js');

class ChallengeAPI {
    constructor() { this.API = API }
    async get(no) { return await API.Challenges.findOne({where: {no: no}}) }
    async getByTitle(title) { return await API.Challenges.findOne({where: {title: title}}) }
    async getByAuthor(author) { return await API.Challenges.findAll({where: {nickname: nickname}}) }
    async getPointByNo(no) { return await API.Challenges.findOne({attributes: [no], where: {no: no}}) }
    async getCategory() { return await API.Challenges.findAll({attributes: ['category'], where: {hidden: 0}, group: ['category']}) }
}

module.exports = new ChallengeAPI();
