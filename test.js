var https = require('https');
var fs = require('fs');

var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}; 

var testUrl = 'https://pp.vk.me/c7002/v7002351/2ad97/ecZTwv9d1BU.jpg';
var destination = __dirname+'/kek.jpg';
download(testUrl, destination, console.log('did it'));