const api = {};

api.Users = require('./Users');
api.Solvers = require('./Solvers');
api.Challenges = require('./Challenges');
api.Admin = require('./admin');
api.Log = require('./log');

module.exports = api;
