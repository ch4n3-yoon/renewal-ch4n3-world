module.exports = (sequelize, DataTypes) => {
    return sequelize.define('users', {
        no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
        },
        email: {
            type: DataTypes.TEXT('tiny'),
            allowNull: false,
        },
        password: {
            type: DataTypes.TEXT('tiny'),
            allowNull: false,
        },
        nickname: {
            type: DataTypes.TEXT('tiny'),
            allowNull: false,
        },
        admin: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0,
        },
    }, {
        charset: 'utf8',
        collate: 'utf8mb4_bin',
        timestamps: true,
    });
};