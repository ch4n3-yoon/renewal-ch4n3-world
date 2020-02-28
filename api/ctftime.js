const Sequelize = require('sequelize');
const API = require('./config.js').API;

class UserAPI {
    constructor() { this.API = API }
    async getOpenTime() {  }

}

module.exports = new UserAPI();
