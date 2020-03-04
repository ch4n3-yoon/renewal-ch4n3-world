const API = require('../api/config').API;
const UserAPI = require('../api/user');
const ChallengeAPI = require('../api/challenge');

class ChallengeService {
    constructor() {}
    static async setChallengeByNo(challenge_no) {
        return await API.Challenges.findOne({where: {no: challenge_no}, raw: true});
    }

    static async getChallengeModelByFlag(flag) {
        console.log('Executed');
        return await API.Challenges.findOne({where: {flag: flag}, raw: true});
    }



}

module.exports = ChallengeService;