module.exports = (sequelize, DataTypes) => {
    return sequelize.define('challenges', {
        no: {
            type: DataTypes.INTEGER(10).UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        flag: {
            type: DataTypes.STRING,
            allowNull: false
        },
        point: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        hidden: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0
        },
    },{
        charset: 'utf8',
        collate: 'utf8mb4_bin',
        timestamps: true,
    });
};