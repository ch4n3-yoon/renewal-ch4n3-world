const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const API = require('./config.js').API;

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
    async deleteUser(user_no) { return await API.Users.destroy({where: {no: user_no}}) }
    async isUserEmailAlreadyExist(email) { return await API.Users.count({where: {email: email}}); }
    async isUserNicknameAlreadyExist(nickname) { return await API.Users.count({where: {nickname: nickname}}); }
    async isUserTelAlreadyExist(tel) { return await API.Users.count({where: {tel: tel}}); }
    async isAdmin(user_no) { return await API.Users.findOne({where: {no: user_no}, attributes: ['admin']}); }
    async createUser(email, password, nickname) { return await API.Users.create({email: email, password, nickname: nickname}); }

    async updateUserWithoutPassword(user_no, email, nickname, admin, justforfun) {
        return await API.Users.update(
            {email: email, nickname: nickname, admin: admin, justforfun: justforfun}, {where: {no: user_no}});
    }

    async updateUserWithPassword(user_no, email, password, nickname, admin) {
        return await API.Users.update(
            {email: email, password: password, nickname: nickname, admin: admin}, {where: {no: user_no}});
    }

    async rank() {
        let sqlData = await API.query("select *, " +
            "(select " +
            "sum((select point from challenges where challenges.no = solvers.challenge_no)) " +
            "from solvers where user_no = users.no) as point, " +
            "(select solve_time from solvers where user_no = users.no order by solve_time desc limit 1) as lastsolvetime " +
            "from users where admin = 0 order by point desc, lastsolvetime asc", { type: Sequelize.QueryTypes.SELECT });
        return sqlData;
    }

    async rankWithAdmin() {
        let sqlData = await API.query("select *, " +
            "(select " +
            "sum((select point from challenges where challenges.no = solvers.challenge_no)) " +
            "from solvers where user_no = users.no) as point, " +
            "(select solve_time from solvers where user_no = users.no order by solve_time desc limit 1) as lastsolvetime " +
            "from users order by point desc, lastsolvetime asc", { type: Sequelize.QueryTypes.SELECT });
        return sqlData;
    }

}

module.exports = new UserAPI();
