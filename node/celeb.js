var solr = require('solr-client'),
	twitter = require('./twitter.js'),
	fs = require('fs'),
	util = require('util');

var celebClient = solr.createClient("127.0.0.1", "8983", "celebrities");

var addCelebsFromFile = function(path){
	fs.readFile(path, function(err, data){
		if(err){
			throw err;
		}
		var content = data;

		// create Array of screen_names from data
	});
};

var addCeleb = function(screen_name){
	twitter.getCelebData(screen_name, function(err, data){
		if(err){
			throw err;
		}

		celebClient.add(data, function(err, obj){
			if(err){
				console.log(err);
			} else {
				console.log(util.inspect(obj));
			}
		})
	});
};

export.addCelebsFromFile = addCelebsFromFile;