const UserModel = require('../models/Users');
const API = require('../api/config').API;
const UserAPI = require('../api/user');

const sha512 = function(str) {
    return require('crypto').createHash('sha512').update(str).digest('hex');
};

class UserService {
    constructor() {}

    static async getByNo(no) {
        return await API.Users.findOne({where: {no: no}});
    }

    static async getByEmail(email) {
        return await API.Users.findOne({where: {email: email}});
    }

    static async getByNickname(nickname) {
        return await API.Users.findOne({where: {nickname: nickname}});
    }

    static async login(email, password) {
        return await API.Users.findOne({where: {email: email, password: password}});
    }

    static async getAllUsers() {
        return await API.Users.findAll({order: [['nickname', 'asc']]});
    }

    static async getEmailByNo(no) {
        return await API.Users.findOne({attributes: ['email'], where: {no: no}})
    }
    async getNicknameByNo(no) { return await API.Users.findOne({attributes: ['nickname'], where: {no: no}}) }
    async isUserInfoExist(email, nickname) { return await API.Users.count({where: { [Op.or]: [{email: email, nickname: nickname}]} }) }
    async isAdmin(user_no) { return await API.Users.findOne({attributes: ['admin'], where: {no: user_no}}) }
    async deleteUser(user_no) { return await API.Users.destroy({where: {no: user_no}}) }
    static async isUserEmailAlreadyExist(email) {
        return await API.Users.count({where: {email: email}});
    }
    static async isUserNicknameAlreadyExist(nickname) {
        return await API.Users.count({where: {nickname: nickname}});
    }

    static async isAdmin(user_no) {
        return await API.Users.findOne({where: {no: user_no}, attributes: ['admin']});
    }

    static async createUser(email, password, nickname) {
        return await API.Users.create({email: email, password, nickname: nickname});
    }

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

    //------------------------------------------------------

    static async Signup(userDTO) {

        let status = {error: false};

        // TODO: validator 객체 따로 만들어서 코드 옮기기

        if (userDTO.password.length < 6) {
            status.error = true;
            status.message = 'Password must be at least 6 characters long';
            return status;
        }

        let email = userDTO.email.trim();
        let nickname = userDTO.nickname.trim();
        let password = sha512(userDTO.password.trim());

        if (await this.isUserEmailAlreadyExist(email) > 0) {
            status.error = true;
            status.message = 'Duplicated email';
        }

        else if (await this.isUserNicknameAlreadyExist(nickname) > 0) {
            status.error = true;
            status.message = 'Duplicated nickname';
        }

        else {
            const userRecord = await this.createUser(email, password, nickname);

            let result = await this.login(email, password);
            if (result) {
                status.message = 'You have successfully signed up';
                status.userModel = userRecord;
            }

            else {
                status.error = true;
                status.message = 'Database connection error';
            }
        }

        return status;
    }
}

module.exports = UserService;