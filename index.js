require('newrelic');

var TelegramBot = require('node-telegram-bot-api'),
     fs = require('fs'),
     https = require('https'),
     request = require('request'),
     cronJob = require('cron').CronJob,
     config = require('./config'),
     foxP = require('./mangafoxP.js');
const options = {
  	webHook:{
  		port: process.env.PORT
  	}
  };
var token = config.token;
const urlH = process.env.APP_URL || config.herokURL;
// Create a bot that uses 'polling' to fetch new updates
var bot = new TelegramBot(config.token, options);
//setting webhook
bot.setWebHook(`${urlH}/bot${token}`);

var download = function(url, dest, msg, callback) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(callback);
      bot.sendPhoto(msg.chat.id,dest,{reply_to_message_id:msg.message_id, caption:msg.document.mime_type});
    });
  });
}; 

function matchRule(str, rule) {
  return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
};

//cron job to periodically parse all db entries
new cronJob('00 30 7 * * 1', ()=>{
	 MongoClient.connect(db, function(err, db) {
        foxP.showDocuments(db, function() {
        db.close();
           });
        });
},null,true);

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, function (msg, match) {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  var chatId = msg.chat.id;
  var resp = match[1]; // the captured "whatever"
  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/love/, function (msg){
	const opts = {
		//reply_to_message_id: msg.message_id,
		reply_markup: JSON.stringify({
			remove_keyboard: true,
			resize_keyboard: true,
			keyboard:[['I love you'],['No, i don\'t'],['<3']]
		})
	};
	bot.sendMessage(msg.chat.id,'Do you love me?',opts);
});
//supposedly shows basic info about current chat but somehow doesn't work as intended
bot.onText(/\/whoami/, function(msg){
	bot.sendMessage(msg.chat.id,bot.getMe.id+' mi id');
	bot.sendMessage(msg.chat.id,bot.getMe.first_name+' mi name');
	bot.sendMessage(msg.chat.id,bot.getMe.last_name+' mi surname');
	bot.sendMessage(msg.chat.id,bot.getMe.username+' mi nick');
	bot.sendMessage(msg.chat.id,msg.chat.id+' chat id');
});
//reply to keyboard reply
bot.onText(/I love you/, function(msg){

	const opts = {
		reply_to_message_id: msg.message_id,
		reply_markup: JSON.stringify({
			remove_keyboard: true,
			resize_keyboard: true,
			keyboard:[['/help']]
			}),
	};
	bot.sendMessage(msg.chat.id,'<3',opts);
})
//responds to every text which contains *hi*
bot.onText(/hi/, function(msg){
	bot.forwardMessage(msg.from.id,msg.chat.id,msg.message_id);
});

bot.onText(/\/parse (.+)/,function(msg, match){
const opts = {parse_mode:'markdown',disable_web_page_preview:true};
//TODO:	create better parser to parse different sites (mangafox still the best manga site, ofc)
	var rss = match[1];
	foxP.addToDB(rss, msg.chat.id, (bool,chapter,name,link)=>{
		if (!bool) bot.sendMessage(msg.chat.id,'Couldn\'t add your link');
		else bot.sendMessage(msg.chat.id,'Latest chapter is '+chapter+' of '+name+'\n'+'[Link]('+link+')',opts);
	});
});

bot.onText(/\/help/,function(msg){
	bot.sendMessage(msg.from.id, 
	'Rn i can show you some /love \n say what you want /echo \n tell you the basic properties of img that you sent to me\n'+
	'/parse [url] where url is link to rss (.xml) feed of your manga (rn parsing only mangafox)')
});

bot.onText(/\/start/, function (msg){
	chatId = msg.chat.id;
	bot.sendMessage(msg.chat.id,'Howdy partner');
});

bot.on('photo', function (msg) {
	var chatId = msg.chat.id;
	var picSize = JSON.stringify(msg.photo[0].file_size);
	bot.sendMessage(chatId, picSize);
});

bot.on('document', function(msg){
	if (matchRule(msg.document.mime_type,'image/*')){
	var chatId = msg.chat.id;
	var destination = __dirname+'/temp.jpg';
	bot.getFile(msg.document.file_id).then(function (data){
		var imgLink = 'https://api.telegram.org/file/bot'+token+'/'+data.file_path;
		download(imgLink,destination, msg);	
	});}
});