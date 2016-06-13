var fs = require('fs');
var request = require('request');
var path = require("path");
var url = require("url");
var spawn = require('child_process').spawn;
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

var config = require('./config.js');

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
process.env['LD_LIBRARY_PATH'] = process.env['LD_LIBRARY_PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];


exports.handler = function(event, context, callback) {
  var promises = [];
  var filenames = [];

  //Download each of the files
  event.input.forEach(function(inputUrl) {
    var fileName = path.basename(url.parse(inputUrl).pathname);
    filenames.push('/tmp/' + fileName);

    promises.push(new Promise(function(resolve, reject) {
      var file = fs.createWriteStream('/tmp/' + fileName);

      var stream = request.get(inputUrl).pipe(file);
      stream.on('finish', function() {
        resolve();
      });
    }.bind()));
  }.bind());

  //Once all files have been downloaded, perform the concatenation
  Promise.all(promises).then(function(values) {
    console.log('fooo');
    var params = filenames;
    params.push('cat');
    params.push('output');
    params.push('/tmp/out.pdf');
    console.log(params);
    var child = spawn('pdftk', params);

    child.stdout.on('data', function (data) {
  	  console.log('stdout: ' + data);
	  });
    child.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
    });
  	child.on('close', function (code) {
  		console.log('child process exited with code ' + code);

      //Generate a filename for the output
      var filename = Math.random().toString(36).slice(2) + '.pdf';

      //Save the object to S3
      s3.putObject({
        Bucket : config.bucket,
        Key : filename,
        Body : fs.createReadStream('/tmp/out.pdf'),
        ContentType : "application/pdf"
      }, function(error, data) {

        if (error != null) {
          callback('Unable to upload report');
        } else {
          //Generate a signed URL
          var signedUrl = s3.getSignedUrl('getObject', { Bucket: config.bucket, Key: filename, Expires: config.expiry });

          callback(null, { url: signedUrl });
        }
      });
  	});

  });

}
