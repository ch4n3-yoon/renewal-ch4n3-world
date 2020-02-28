module.exports = (sequelize, DataTypes) => {
    return sequelize.define('authlog', {
        no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        challenge_no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            allowNull: false
        },
        user_no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            allowNull: false
        },
        user_flag: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        state: {
            type: DataTypes.ENUM('CORRECT', 'WRONG', 'ALREADY SOLVED'),
            allowNull: false,
        },
        try_time: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },{
        charset: 'utf8',
        collate: 'utf8mb4_bin',
        timestamps: true,
    });
};