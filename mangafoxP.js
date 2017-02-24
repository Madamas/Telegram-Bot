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
	            methods.addDocuments(db, name, chapter, rss, link, chatId, () => {
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
	    	}
	    else{
	        parseString(page,(err,result) =>{
	        var chapter = result.rss.channel[0].item[0].title[0];
	        var name = result.rss.channel[0].title[0];
	        var link = result.rss.channel[0].item[0].link[0];
	        var rss = uri;
	          MongoClient.connect(db, function(err, db) {
	            methods.addDocuments(db, name, chapter, rss, link, chatId, (chapter,name,link) => {
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
	  collection.find({}).toArray( (err, docs) => {
	    docs.forEach(parseMany);
	    callback(docs);
	  });      
	},
	insertDocuments: function(db, name, chapter, rss, chatId, callback) {
	  var collection = db.collection('documents');
	  collection.insertMany([{ user: chatId, name: name, ch: chapter, rss: rss}], (err, result) => {
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
	        collection.updateOne({user:chatId, name:name},{ch:chapter},()=>{callback(chapter,name,link);});
	      }
	    }
	    else
	    {
	     methods.insertDocuments(db,name,chapter,rss, chatId,()=>{callback(chapter,name,link);}); 
	    }

	  });      
	}
};
module.exports = methods;