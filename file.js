var TelegramBot = require('node-telegram-bot-api');
var FeedParser = require('feedparser');
var https = require('https');
var fs = require('fs');
var request = require('request');
var parseString = require('xml2js').parseString;
// replace the value below with the Telegram token you receive from @BotFather
var token = '304133003:AAEfcelIbqpnGOshxjuV5d4KzISMzuQzUNY';
var util = require('util');
var cronJob = require('cron').CronJob;
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
// Create a bot that uses 'polling' to fetch new updates
var bot = new TelegramBot(token, { polling: true });
var db = 'mongodb://localhost:27017/TeleBot';

var download = function(url, dest, msg, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
      bot.sendPhoto(msg.chat.id,dest,{reply_to_message_id:msg.message_id, caption:msg.document.mime_type});
    });
  });
}; 
//parsing all entries in db to look for updates
function parseMany(element,index,array){
  var rss = element.rss;
  var chatId = element.user;
  request({uri:rss,method:'POST',encoding:'binary'},
    function(err,res,page){
     parseString(page,(err,result) =>{
        var chapter = result.rss.channel[0].item[0].title[0];
        var name = result.rss.channel[0].title[0];
        var link = result.rss.channel[0].item[0].link[0];
          MongoClient.connect(db, function(err, db) {
            assert.equal(null, err);
            addDocuments(db, name, chapter, rss, link, chatId, function() {
             });
          });
     });
  });
};
//first addition to db
function addToDB(uri,chatId){
  request({uri: uri,method:'POST',encoding:'binary'},
    function(err,res,page){
    	if (err)
    {bot.sendMessage(chatId,'Couldn\'t add your link');}
    else{
     parseString(page,(err,result) =>{
        var chapter = result.rss.channel[0].item[0].title[0];
        var name = result.rss.channel[0].title[0];
        var link = result.rss.channel[0].item[0].link[0];
        var rss = uri;
          MongoClient.connect(db, function(err, db) {
          assert.equal(null, err);
            addDocuments(db, name, chapter, rss, link, chatId, function() {
             bot.sendMessage(chatId,'Added your title :)');
             db.close();
             });
          });
     });
 	}
  });
};
//updates db and shows message if new chapter is out
var showDocuments = function(db, callback) {
  var collection = db.collection('documents');
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    docs.forEach(parseMany);
    callback(docs);
  });      
};
//adds new entry to db
var insertDocuments = function(db, name, chapter, rss, chatId, callback) {
  var collection = db.collection('documents');
  collection.insertMany([{ user: chatId, name: name, ch: chapter, rss: rss}], function(err, result) {
    assert.equal(err, null);
    callback(result);
  });
};
//sends an message if new chapter of existing db entry
//or if entry isn't in db adds it 
var addDocuments = function(db, name, chapter, rss, link, chatId, callback) {
  var collection = db.collection('documents');
  const opts = {parse_mode:'markdown',disable_web_page_preview:true};
  collection.find({'user': chatId, 'name':name}).toArray(function(err, docs) {
    assert.equal(err, null);
    if(docs.length){
      if(docs[0].ch == chapter)
        callback(docs);
      else
      {
        bot.sendMessage(chatId,'Latest chapter is '+chapter+' of '+name+'\n'+'[Link]('+link+')',opts);
        collection.updateOne({user:chatId, name:name},{ch:chapter},()=>{callback(docs);});
      }
    }else
    {
	 bot.sendMessage(chatId,'Latest chapter is '+chapter+' of '+name+'\n'+'[Link]('+link+')',opts);
     insertDocuments(db,name,chapter,rss, chatId,()=>{callback(docs);}); 
    }
    callback(docs);
  });      
};


function matchRule(str, rule) {
  return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
};

//cron job to periodically parse all db entries
new cronJob('00 30 7 * * 1', ()=>{
	 MongoClient.connect(db, function(err, db) {
        assert.equal(null, err);
        showDocuments(db, function() {
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

//TODO:	create better parser to parse different sites (mangafox still the best manga site, ofc)
	var rss = match[1];
	addToDB(rss, msg.chat.id);
});

bot.onText(/\/help/,function(msg){
	bot.sendMessage(msg.from.id, 
	'Rn i can show you some /love say what you want /echo and tell you the basic properties of img that you sent to me\n'+
	'/parse [url] where url is link to rss (.xml) feed of your manga (rn parsing only mangafox)')
});

bot.onText(/\/start/, function (msg){
	chatId = msg.chat.id;
	bot.sendMessage(msg.chat.id,'Hi, this useless shit provided to you by shit company');
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

bot.onText(/\/testuserphoto$/, function (msg) {
    var chatId = msg.chat.id;
    var userId = msg.from.id;

    bot.getUserProfilePhotos(userId, 0, 1).then(function(data){
      bot.sendPhoto(chatId,data.photos[0][0].file_id,{caption: "It's your photo!"});
    });

});