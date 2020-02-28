const Sequelize = require('sequelize');
const API = require('./config.js').API;
const Op = Sequelize.Op;

class ChallengeAPI {
    constructor() { this.API = API }
    async getSolvers(no) { return await API.Solvers.count({where: {challenge_no: no}}) }
    async isSolvedChallenge(challenge_no, user_no) { return await API.Solvers.count({where: {user_no: user_no, challenge_no: challenge_no}})}
    async removeSolveLog(chall_no) { return await API.Solvers.destroy({where: {challenge_no: chall_no}}) }
    async getSolvedChalls(user_no) { return await API.Solvers.findAll({where: {user_no: user_no}}) }
    async getSolvedTime(chall_no, user_no) { return await API.Solvers.findOne({attributes: ['solve_time'], where: {challenge_no: chall_no, user_no: user_no}}) }
    async deleteUserSolvedLog(user_no) { return await API.Solvers.destroy({where: {user_no: user_no}}) }
    async addSolver(challenge_no, user_no) {
        return await API.Solvers.create({challenge_no: challenge_no, user_no: user_no, solve_time: Sequelize.fn('now')});
    }

    async getSolvedRank(challenge_no, solve_time) {
        let sqlData =
            await API.query("select count(*) as `count` from solvers " +
                            "where (select admin from users where users.no = solvers.user_no) = 0 " +
                            "and challenge_no = ? and solve_time <= ?",
                { replacements: [challenge_no, solve_time], type: Sequelize.QueryTypes.SELECT });
        return sqlData[0].count;
    }


}

/*
API.Solvers = API.define('solvers', {
    no: { type: Sequelize.INTEGER(10).UNSIGNED , primaryKey: true, autoIncrement: true },
    challenge_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    user_no: { type: Sequelize.INTEGER(10).UNSIGNED, allowNull: false },
    solve_time: Sequelize.DATE,
});

+--------------+------------------+------+-----+---------+----------------+
| Field        | Type             | Null | Key | Default | Extra          |
+--------------+------------------+------+-----+---------+----------------+
| no           | int(10) unsigned | NO   | PRI | NULL    | auto_increment |
| challenge_no | int(10) unsigned | NO   |     | NULL    |                |
| user_no      | int(10) unsigned | NO   |     | NULL    |                |
| solve_time   | datetime         | YES  |     | NULL    |                |
| createdAt    | datetime         | NO   |     | NULL    |                |
| updatedAt    | datetime         | NO   |     | NULL    |                |
+--------------+------------------+------+-----+---------+----------------+
6 rows in set (0.03 sec)
 */

module.exports = new ChallengeAPI();
