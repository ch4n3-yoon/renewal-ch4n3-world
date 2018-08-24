const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const API = require('./config.js');

class UserAPI {
    constructor() { this.API = API }
    async getByNo(no) { return await API.Users.findOne({where: {no: no}}); }
    async getByEmail(email) { return await API.Users.findOne({where: {email: email}}); }
    async getByNickname(nickname) { return await API.Users.findOne({where: {nickname: nickname}}); }
    async login(email, password) { return await API.Users.findOne({where: {email: email, password: password}}); }
    async getAllUsers() { return await API.Users.findAll({order: [['nickname', 'asc']]}); }
    async getEmailByNo(no) { return await API.Users.findOne({attributes: ['email'], where: {no: no}}) }
    async getNicknameByNo(no) { return await API.Users.findOne({attributes: ['nickname'], where: {no: no}}) }
    async isUserInfoExist(email, nickname) { return await API.Users.count({where: { [Op.or]: [{email: email, nickname: nickname}]} }) }
    async isAdmin(user_no) { return await API.Users.findOne({attributes: ['admin'], where: {no: user_no}}) }

    async createUser(email, password, nickname) {
        return await API.Users.create({email: email, password: password, nickname: nickname, register_time: Sequelize.fn('now')});
    }

    async updateUserWithoutPassword(user_no, email, nickname, admin) {
        return await API.Users.update({email: email, nickname: nickname, admin: admin}, {where: {no: user_no}});
    }

    async updateUserWithPassword(user_no, email, password, nickname, admin) {
        return await API.Users.update({email: email, password: password, nickname: nickname, admin: admin}, {where: {no: user_no}});
    }
}

module.exports = new UserAPI();
