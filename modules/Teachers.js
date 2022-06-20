const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Contacts = require('./Contacts');
const Roles = require('./Roles');

const Teachers = sequelize.define('Teachers',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	TeacherId:{
		type: Sequelize.INTEGER,
	},
	FirstName: {
		type: Sequelize.STRING,
	},
	LastName: {
		type: Sequelize.STRING,
	},
	MiddleName: {
		type: Sequelize.STRING
	},
	ContactId:{
		type: Sequelize.INTEGER,
	},
	Email: {
		type: Sequelize.STRING,
	},
	Password: {
		type: Sequelize.STRING,
	},
	createdAt: {
		type: Sequelize.DATE, 
		defaultValue: Sequelize.NOW,
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	AUTH: {
		type: Sequelize.TEXT,
	},
	RoleId: {
		type: Sequelize.INTEGER,
	},
	Rate90:{
		type: Sequelize.INTEGER
	},
	Rate60:{
		type: Sequelize.INTEGER
	}
});

Contacts.hasMany(Teachers,{ foreignKey: 'ContactId', sourceKey: 'Id'});
Teachers.belongsTo(Contacts,{ foreignKey:'ContactId', targetKey: 'Id'});

Roles.hasMany(Teachers,{ foreignKey: 'RoleId', sourceKey: 'Id'});
Teachers.belongsTo(Roles,{ foreignKey:'RoleId', targetKey: 'Id'});

module.exports = Teachers;

