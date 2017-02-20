var TelegramBot = require('node-telegram-bot-api');
var FeedParser = require('feedparser');
var https = require('https');
var fs = require('fs');
var request = require('request');
var parseString = require('xml2js').parseString;
var util = require('util');
var cronJob = require('cron').CronJob;
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');


var url = 'mongodb://localhost:27017/TeleBot';

function parseMany(element,index,array){
  var rss = element.rss;
  request({uri:rss,method:'POST',encoding:'binary'},
    function(err,res,page){
     parseString(page,(err,result) =>{
        var chapter = result.rss.channel[0].item[0].title[0];
        var name = result.rss.channel[0].title[0];
        var link = result.rss.channel[0].item[0].link[0];
          MongoClient.connect(url, function(err, db) {
            assert.equal(null, err);
            addDocuments(db, name, chapter, rss, link, function() {
             });
          });
     });
  });
};

function addToDB(uri){
  request({uri: uri,method:'POST',encoding:'binary'},
    function(err,res,page){
     parseString(page,(err,result) =>{
        var chapter = result.rss.channel[0].item[0].title[0];
        var name = result.rss.channel[0].title[0];
        var link = result.rss.channel[0].item[0].link[0];
        var rss = uri;
          MongoClient.connect(url, function(err, db) {
          assert.equal(null, err);
            addDocuments(db, name, chapter, rss, link, function() {
             db.close();
             });
          });
     });
  });
};

var showDocuments = function(db, callback) {
  var collection = db.collection('documents');
  collection.find({}).toArray(function(err, docs) {
    assert.equal(err, null);
    docs.forEach(parseMany);
    callback(docs);
  });      
};


var insertDocuments = function(db, name, chapter, rss, callback) {
  var collection = db.collection('documents');
  collection.insertMany([{ _id: name, ch : chapter, rss: rss}], function(err, result) {
    assert.equal(err, null);
    callback(result);
  });
};

var addDocuments = function(db, name, chapter, rss, link, callback) {
  var collection = db.collection('documents');
  collection.find({'_id': name}).toArray(function(err, docs) {
    assert.equal(err, null);
    if(docs.length){
      if(docs[0].ch == chapter)
        callback(docs);
      else
      {
        console.log('Latetst chapter '+chapter+' of '+name+'\n link '+link+'\n');
        collection.updateOne({_id:name},{ch:chapter},()=>{callback(docs);});
      }
    }else
    {
     console.log('Latetst chapter '+chapter+' of '+name+'\n link '+link+'\n');
     insertDocuments(db,name,chapter,rss,()=>{callback(docs);}); 
    }
    callback(docs);
  });      
};

var one = 'http://mangafox.me/rss/relife.xml';
var two = 'http://mangafox.me/rss/d_gray_man.xml';

addToDB(one);
addToDB(two);

new cronJob('30 * * * * *', ()=>{
  
   MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        showDocuments(db, function() {
        db.close();
           });
        });
},null,true);

/*
<ul id="fruits">
  <li class="apple">Apple</li>
  <li class="orange">Orange</li>
  <li class="pear">Pear</li>
</ul>

 fs.appendFile('fuckingShit.md', latest_shit, (err) => {
      if (err) throw err;
      console.log('wrote yer data');
    });
    console.log(latest_shit);



request({uri:'http://mangafox.me/rss/relife.xml',method:'POST',encoding:'binary'},
    function(err,res,page){
     parseString(page,(err,result) =>{
        var chapter = result.rss.channel[0].item[0].title[0];
        var name = result.rss.channel[0].title[0];
        var link = result.rss.channel[0].item[0].link[0];
        var rss = 'http://mangafox.me/rss/relife.xml';
          MongoClient.connect(url, function(err, db) {
          assert.equal(null, err);
            addDocuments(db, name, chapter, rss, link, function() {
             db.close();
             });
          });
     });
  });


*/