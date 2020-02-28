module.exports = (sequelize, DataTypes) => {
    return sequelize.define('solvers', {
        no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
        },
        challenge_no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            allowNull: false,
        },
        user_no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            allowNull: false,
        },
        solve_time: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },{
        charset: 'utf8',
        collate: 'utf8mb4_bin',
        timestamps: true,
    });
};