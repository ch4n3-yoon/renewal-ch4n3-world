const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const API = require('./config.js');

class UserAPI {
    constructor() { this.API = API }
    async get(no) { return await API.Users.findOne({where: {no: no}}); }
    async getByEmail(email) { return await API.Users.findOne({where: {email: email}}); }
    async getByNickname(nickname) { return await API.Users.findOne({where: {nickname: nickname}}); }
    async login(email, password) { return await API.Users.findOne({where: {email: email, password: password}}); }
    async getList() { return await API.Users.findAll(); }
    async getEmailByNo(no) { return await API.Users.findOne({attributes: ['email'], where: {no: no}}) }
    async getNicknameByNo(no) { return await API.Users.findOne({attributes: ['nickname'], where: {no: no}}) }
    async isUserInfoExist(email, nickname) { return await API.Users.count({where: { [Op.or]: [{email: email, nickname: nickname}]} }) }
    async isAdmin(user_no) { return await API.Users.findOne({attributes: ['admin'], where: {no: user_no}}) }

    async createUser(email, password, nickname) {
        return await API.Users.create({email: email, password: password, nickname: nickname, register_time: Sequelize.fn('now')});
    }
}

module.exports = new UserAPI();
