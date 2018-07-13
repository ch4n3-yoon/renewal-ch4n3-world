const Sequelize = require('sequelize');
const API = require('./config.js');

class UserAPI {
    constructor() { this.API = API }
    async get(no) { return await API.Users.findOne({where: {user_id: no}}); }
    async getByEmail(email) { return await API.Users.findOne({where: {email: email}}); }
    async getByNickname(nickname) { return await API.Users.findOne({where: {nickname: nickname}}); }
    async login(email, password) { return await API.Users.findOne({where: {email: email, password: password}}); }
    async getList() { return await API.Users.findAll(); }
}

module.exports = new UserAPI();
