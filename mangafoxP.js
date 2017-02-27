var request = require('request'),
	MongoClient = require('mongodb').MongoClient,
	config = require('./config'),
	parseString = require('xml2js').parseString;
var db = config.dbURL;
var methods = {
	parseMany: function (element,index,array){
	  var rss = element.rss;
	  var chatId = element.user;
	  request({uri:rss,method:'POST',encoding:'binary'},
	    function(err,res,page){
	     parseString(page,(err,result) =>{
	        var chapter = result.rss.channel[0].item[0].title[0];
	        var name = result.rss.channel[0].title[0];
	        var link = result.rss.channel[0].item[0].link[0];
	          MongoClient.connect(db, function(err, db) {
	            methods.addDocuments(db, name, chapter, rss, link, chatId, function() {
	             });
	          });
	     });
	  });
	},
	addToDB:function (uri,chatId,callback){
	  request({uri: uri,method:'POST',encoding:'binary'},
	    function(err,res,page){
	    if (err)
	    {	callback(false);
	    	/*bot.sendMessage(chatId,'Couldn\'t add your link');*/}
	    else{
	        parseString(page,(err,result) =>{
	        var chapter = result.rss.channel[0].item[0].title[0];
	        var name = result.rss.channel[0].title[0];
	        var link = result.rss.channel[0].item[0].link[0];
	        var rss = uri;
	        //bot.sendMessage(chatId,'Added your title :)');
	          MongoClient.connect(db, function(err, db) {
	            methods.addDocuments(db, name, chapter, rss, link, chatId, function(chapter,name,link) {
	             db.close();
	             callback(true,chapter,name,link);
	             });
	          });
	     });
	 	}
	  });
	},
	showDocuments: function(db, callback) {
	  var collection = db.collection('documents');
	  collection.find({}).toArray(function(err, docs) {
	    docs.forEach(parseMany);
	    callback(docs);
	  });      
	},
	insertDocuments: function(db, name, chapter, rss, chatId, callback) {
	  var collection = db.collection('documents');
	  collection.insertMany([{ user: chatId, name: name, ch: chapter, rss: rss}], function(err, result) {
	    callback(result);
	  });
	},
	addDocuments: function(db, name, chapter, rss, link, chatId, callback) {
	  var collection = db.collection('documents');
	  collection.find({'user': chatId, 'name':name}).toArray(function(err, docs) {
	    if(docs.length){
	      if(docs[0].ch == chapter)
	        callback(chapter, name, link);
	      else
	      {
	        //bot.sendMessage(chatId,'Latest chapter is '+chapter+' of '+name+'\n'+'[Link]('+link+')',opts);
	        collection.updateOne({user:chatId, name:name},{ch:chapter},()=>{callback(chapter,name,link);});
	      }
	    }else
	    {
		 //bot.sendMessage(chatId,'Latest chapter is '+chapter+' of '+name+'\n'+'[Link]('+link+')',opts);
	     methods.insertDocuments(db,name,chapter,rss, chatId,()=>{callback(chapter,name,link);}); 
	    }
	    //callback(docs);
	  });      
	}
};
module.exports = methods;