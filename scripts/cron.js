const cron = require('node-cron');
const Registers = require('../modules/Registers');
const Subregisters = require('../modules/SubRegisters');
const api = require('../api/api');
const express = require('express');
const Promise = require('bluebird');
const QueueBot = require('smart-request-balancer');
const sequelize = require('../databases/index').sequelize;
const Students = require('../modules/Students');

const key = {
    "domain": process.env.DOMAIN,
    "apikey": process.env.APIKEY
};

const bot = require('../bot/createBot');
const botUtils = require('../bot/botUtils');

const queueBot = new QueueBot({
	rules:{
		telegramIndividual: {
			rate: 1,    // one message
			limit: 1,   // per second
			priority: 1
		},
		telegramGroup: {
			rate: 20,    // 20 messages
			limit: 60,  // per minute
			priority: 1
		},
		telegramBroadcast: {
			rate: 30,
			limit: 2,
			priority: 2
		}
	},
	default: {                   // Default rules (if provided rule name is not found
		rate: 30,
		limit: 1
	},
	overall:{
		rate: 30,       
		limit: 1
	},
	retryTime: 300,              // Default retry time. Can be configured in retry fn
	ignoreOverallOverheat: false  // Should we ignore overheat of queue itself  
});

/*function sleep(ms){
	console.log(`Ждем ${ms}`);
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    });
}*/

/*function sendTelegram(register,subregister){
	var url = 'https://'+process.env.DOMAIN+'.t8s.ru/Learner/Group/'+register.GroupId;

		subregister.map(async function(student){
			if(student.Status && student.Pass){
				if(student.ClientId == -1){
					var text = '';
					text = 'Дата урока: ' + register.LessonDate+'\n\n';
					text += 'Найти и добавить ученика в группу\n Ученик: ' + student.FullName + ' в группу: Id: '+ register.GroupId + '\nГруппа: '+ register.GroupName+'\nПреподаватель: '+register.TeacherId+'\nВремя: ' + register.Time + '\nДни: '+ register.WeekDays+ '\n\n';
					var com = student.Comment?student.Comment:'';
					text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
					queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
					.catch(error => {
						console.log(error);
						if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
					}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
				} else {
					var text = '';
					text = 'Дата урока: ' + register.LessonDate+'\n\n';
					text += 'Добавить Ученика: ' + student.FullName + ' в группу: Id: '+ register.GroupId + '\nГруппа: '+ register.GroupName+'\nПреподаватель: '+register.TeacherId+'\nВремя: ' + register.Time + '\nДни: '+ register.WeekDays+ '\n\n';
					var com = student.Comment?student.Comment:'';
					text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
					queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
					.catch(error => {
						console.log(error);
						if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
					}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
				}
			}
		});
}

function sendTelegramIND(register,student){
	var text = '';
	var url = 'https://'+process.env.DOMAIN+'.t8s.ru/Learner/Group/'+register.GroupId;
	
	text = 'Дата урока: ' + register.LessonDate+'\n\n';
	text += 'Найти и добавить ученика в группу\n Ученик: ' + student.FullName + ' в группу: Id: '+ register.GroupId + '\nГруппа: '+ register.GroupName+'\nПреподаватель: '+register.TeacherId+'\nВремя: ' + register.Time + '\nДни: '+ register.WeekDays+ '\n\n';
	var com = student.Comment?student.Comment:'';
	text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
	queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
	.catch(error => {
		console.log(error);
		if (error.response.status === 429) { // We've got 429 - too many requests
			return retry(error.response.data.parameters.retry_after) // usually 300 seconds
		}
		throw error; // throw error further
	}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
				
}*/

var crontohh = cron.schedule('50 23 * * *',async () => {
	var students = await Students.findAll({
		attributes: ["Id"]
	});
	await students.reduce(async function(previousPromise,student){
		await previousPromise;
		return new Promise(async function(resolve,reject){
			await Students.destroy({
				where: {
					Id: student.Id
				}
			});

			resolve(true);
		});
	},Promise.resolve(true));

	var params = "take=7000&statuses="+encodeURIComponent('Занимается,Заморозка,Регистрация');
	api.get(key.domain,'GetStudents',params,key.apikey)
	.then((data) => {
		data.data.map(async function(record){
			try{
				var student = await Students.findOne({
					attributes: ['ClientId'],
					where:{
						StudentId: record.Id
					}
				});
				var klass = 'Нет';
				if(record.ExtraFields){
					record.ExtraFields.find(function(record){
						if(record.Name == 'КЛАСС')
							klass = record.Value;
					});
				}
				if(student === null){
					var newStudent = await Students.create({
						Class: klass,
						StudentId: record.Id,
						ClientId: record.ClientId,
						FirstName: record.FirstName,
						LastName: record.LastName,
						MiddleName: record.MiddleName?record.MiddleName:''
					},{
						fields: ['Class','StudentId','ClientId','FirstName','LastName','MiddleName']
					});
				}
			}catch(error){
				console.log(error);
			}
		});
		res.send("ok");
	});
	/*try{
		var registers = await Registers.findAll({
			fields:['Id','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
			where:{
				IsSubmitted: false
			}
		});
		var i = 0;
		var n = registers.length;
		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
					i++;
					var klass = support.getClass(register.GroupName);
					await sleep(10);
					var subregisters = await Subregisters.findAll({
						fields:['ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','SubjectN'],
						where:{
							RegisterId: register.Id
						}
					});
					var params = new Array();
					subregisters.map(function(subregister){
						var st = new Object();
						st.Date = register.LessonDate;
						st.EdUnitId = register.GroupId;
						st.StudentClientId = subregister.ClientId;
						st.Pass = !subregister.Pass;
						st.Payable = false;
						params.push(st);
					});

					if(register.isOperator){
						sendTelegram(register,subregisters);
					}
					var response = await api.post(key.domain,'SetStudentPasses',params,key.apikey);
					if(response.status == 200){
						if(subregisters.length > 0){
							var responses = [];
							await subregisters.reduce(async function(previousStudentPromise,student){
								var res = await previousStudentPromise;
								responses.push(res);
								return new Promise(async function(resolve,reject){
									try{
										
									if(!student.Status && student.Pass && student.ClientId != -1){
										var data = new Object();
										data.edUnitId = register.GroupId;
										data.studentClientId = student.ClientId;
										data.date = register.LessonDate;
										if(klass >= 0 && klass < 4){
											data.testTypeId = process.env.TEST_TYPE_ID_N;
											var skills = new Array();
											var skill = new Object();
											skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // Оценка учителя
											skill.score = student.Homework;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.TEST_SKILL_ID; // Срез
											skill.score = student.Test;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.RANG_SKILL_ID; // Ранг
											skill.score = student.Lesson;
											skills.push(skill);
											if(student.SubjectN){
												skill = new Object();
												skill.skillId = process.env.THEME_SKILL_ID; // Предмет
												skill.score = student.SubjectN;
												skills.push(skill);			
											}
											data.skills = skills;
										}else if(klass >=4 && klass < 6){
											data.testTypeId = process.env.TEST_TYPE_ID_T;
											var skills = new Array();
											var skill = new Object();
											skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // Оценка учителя
											skill.score = student.Homework;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.TEST_SKILL_ID; // Срез
											skill.score = student.Test;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.RANG_SKILL_ID; // Ранг
											skill.score = student.Lesson;
											skills.push(skill);
											if(student.SubjectN){
												skill = new Object();
												skill.skillId = process.env.TOPIC_SKILL_ID; // Предмет
												skill.score = student.SubjectN;
												skills.push(skill);			
											}
											data.skills = skills;
										}else {
											data.testTypeId = process.env.TEST_TYPE_ID;
											var skills = new Array();
											var skill = new Object();
											skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // Оценка учителя
											skill.score = student.Homework;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.TEST_SKILL_ID; // Срез
											skill.score = student.Test;
											skills.push(skill);
											skill = new Object();
											skill.skillId = process.env.RANG_SKILL_ID; // Ранг
											skill.score = student.Lesson;
											skills.push(skill);
											data.skills = skills;
										}
										data.commentHtml = student.Comment;
										var res = await api.post(key.domain,'AddEditEdUnitTestResult',data,key.apikey);
										if(res.status == 200)
											resolve(true);
										else
											reject(false);
									}else{
										resolve(true);
									}
									}catch(err){
										sendTelegramIND(register,student);
										resolve(true);
									}
								});
							},Promise.resolve(true));
							var result = responses.every(elem => elem == true);
							if(result){
								await register.update({
									IsSubmitted: true
								});
								resolve(true);
							}
						} else {
							await register.update({
								IsSubmitted: true
							});
							resolve(true);
						}
					}
				}catch(err){
					console.log(err);
					resolve(true);
				}
			});
		},Promise.resolve(true));

	}catch(ex){
		console.log(ex);
	}*/
},{
	scheduled: false,
	timezone: "Asia/Almaty"
});


module.exports = crontohh;