const Sequelize = require('sequelize');
const API = require('./config.js');

class ChallengeAPI {
    constructor() { this.API = API }
    async getSolvers(no) { return await API.Solvers.count({where: {challenge_no: no}}) }
    async removeSolveLog(chall_no) { return await API.Solvers.destroy({where: {challenge_no: chall_no}}) }
    async addSolver(challenge_no, user_no) {
        return await API.Solvers.create({challenge_no: challenge_no, user_no: user_no, solve_time: Sequelize.fn('now')});
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