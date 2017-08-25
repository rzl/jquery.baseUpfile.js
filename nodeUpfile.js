var express = require('express');
var app = express();
var multiparty = require('multiparty');
var fs = require('fs');

fs.existsSync('tmp') || fs.mkdirSync('tmp');
fs.existsSync('uploads') || fs.mkdirSync('uploads');

app.use(express.static('public'));

app.post('/uploadFile', function (req, res) {
	var form = new multiparty.Form({
			uploadDir: './tmp'
		});
	form.parse(req, function (err, fields, files) {
		var tmpDir = 'uploads/' + require('crypto').createHash('md5').update(fields.fileName[0]).digest('hex');
		fs.existsSync(tmpDir) || fs.mkdirSync(tmpDir);
		fs.rename(files.file[0].path, tmpDir + '/' + fields.blockIndex[0], function (err) {
			if (err) {
				res.json({
					state: false,
					info: err
				});
				return;
			}
			if (fields.blockCount) {
				fs.writeFileSync(fields.fileName[0], fs.readFileSync(tmpDir + '/' + 0))
				for (var a = 1; a < fields.blockCount[0]; a++) {
					var c = fs.readFileSync(tmpDir + '/' + a);
					fs.appendFileSync(fields.fileName[0], c)

				}
				res.json({
					state: true
				});
			} else {
				res.json({
					state: true
				});
			}

		})
	});

});

app.listen(3000);
