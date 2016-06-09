var fs = require('fs');
var http = require('https');

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
process.env['LD_LIBRARY_PATH'] = process.env['LD_LIBRARY_PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];


exports.handler = function(event, context, callback) {
  var promises = [];

  //Download each of the files
  event.input.forEach(function(inputFile) {
    promises.push(new Promise(function(resolve, reject) {
      var fileName = Math.random().toString(36).slice(2) + '.pdf';
      var file = fs.createWriteStream(fileName);

      var request = http.get(inputFile, function(response) {
        response.pipe(file);
      });

      resolve();
    }));
  }.bind());

  Promise.all(promises).then(function(values) {
    console.log('all downloaded');
  });

}
