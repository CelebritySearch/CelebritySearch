var solr = require('solr-client'),
	twitter = require('./twitter.js'),
	fs = require('fs'),
	util = require('util'),
	_und = require('underscore');

var celebClient = solr.createClient("127.0.0.1", "8983", "celebrities");
celebClient.autoCommit = true;

var addCelebsFromFile = function(path){
	fs.readFile(path, "utf-8", function(err, data){
		if(err){
			throw err;
		}

		var content = data.split("\n");
		var lines = [];

		var processedParagraph = null;
		for(var i = 0; i < content.length; i++){
			processedParagraph = content[i].replace(/\r|\n/g, '');
			if(processedParagraph === ''){
				continue;
			} else {
				lines.push(processedParagraph);
			}
		}

		var categories = [];
		var screen_names = [];
		for(var i = 0; i < lines.length; i++){
			if(lines[i].substring(0, 2).indexOf("\t") != -1){

				var line = lines[i].split(/\]\,\s*\[/);
				var categoryScreenNames = [];
				for(var item = 0; item < line.length; item++){
					console.log(line[item]);
					categoryScreenNames.push(line[item].split(/\,\s*/)[1]);
				}
				screen_names.push(categoryScreenNames);

			} else {
				categories.push(lines[i].replace(/\s/, ''));
			}
		}

		var data = {};
		for(var i = 0; i < screen_names.length; i++){
			var category = categories[i];

			var dataset = {};
			for(var j = 0; j < screen_names[i].length; j++){
				var screen_name = screen_names[i][j];
				if(screen_name === undefined){
					console.log("Screen name error, check file at Category " + (i+1) + " and item " + (j+1));
					continue;
				}
				screen_name = screen_name.replace(']', '');
				if(!data[screen_name]){
					data[screen_name] = [category];
				} else {
					if(!_und.contains(data[screen_name], category)){
						data[screen_name].push(category);
					}
				};
			}
		}

		var counter = 0;
		_und.each(data, function(categories, screenName, list){
			counter++;
			if(data.hasOwnProperty(screenName)){
				setTimeout(function(){
					addCeleb(screenName, categories);
				}, counter* 3000);
			}
		});
		// create Array of screen_names from data
	});
};

var addCeleb = function(screen_name, categories){
	console.log(screen_name);
	twitter.getCelebData(screen_name, function(data){
		data.categories = categories;
		console.log(util.inspect(data));

		celebClient.add(data, function(err, obj){
			if(err){
				console.log(err);
			} else {
				console.log(util.inspect(obj));
				celebClient.commit(function(err, res){
					if(err){
						console.log(err);
					} else {
						console.log(res);
					}
				})
			}
		});
	});
};

module.exports.addCelebsFromFile = addCelebsFromFile;