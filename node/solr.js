var solr = require('solr-client'),
	twitter = require('./twitter.js'),
	fs = require('fs'),
	util = require('util'),
	_und = require('underscore');

var TIME_BETWEEN_TWITTER_API_CALLS = 5100;

var celebClient = solr.createClient("127.0.0.1", "8983", "celebrities");
var tweetClient = solr.createClient("127.0.0.1", "8983", "tweets");

tweetClient.autoCommit = true;
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
				}, counter* TIME_BETWEEN_TWITTER_API_CALLS);
			}
		});
	});
};

var addCeleb = function(screen_name, categories){
	twitter.getCelebData(screen_name, function(data){
		data.categories = categories;

		celebClient.add(data, function(err, obj){
			if(err){
				console.log(err);
			} else {
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

var addUserTimeline = function(getUserTimeline){
	twitter.getUserTimeline(screen_name, function(_data){
		for(var i = 0; i < _data.length; i++){
			addTweet(_data[i]);			
		}
	});
};

var addTweet = function(data){
	var tweet = {
		created_at: data.created_at,
		id: data.id_str,
		retweet_count: data.retweet_count,
		favorite_count: data.favorite_count,
		user_id: data.user.id_str,
		user_name: data.user.name,
		screen_name: data.user.screen_name,
		profile_image_url: data.user.profile_image_url,
		text: data.text
	};

	tweetClient.add(tweet, function(err, obj){
		if(err){
			console.log(err);
		} else {
			console.log(obj);
		}
	});
};

var getTweets = function(screen_names, callback){
	var querystring = '';
	if(screen_names.contructor == Array){
		for(var i = 0; i < screen_names.length; i++){
			if(i > 0){
				querystring = querystring+ " OR ";
			}

			querystring = querystring+ "screen_name:" + screen_names[i];
		}
	} else {
		querystring = 'screen_name:' + screen_names;
	}

	console.log(querystring);
	var query = tweetClient.createQuery().q(querystring);

	tweetClient.search(query, function(err, obj){
		if (err) {
			console.log(err);
		} else {
			callback(obj.response.docs);
		}
	});
};

var getCategoryTweets = function(categories, callback){
	getCategoryCelebs(categories, function(celebs){
		var querystring = '';

		for(var i = 0; i < celebs.length; i++){
			if(i > 0){
				querystring = querystring+ " OR ";
			}

			querystring = querystring+ "screen_name:" + celebs[i].screen_name;
		}

		var query = tweetClient.createQuery().q(querystring);

		tweetClient.search(query, function(err, obj){
			if(err){
				console.log(err);
			} else {
				callback(obj.response.docs);
			}
		});
	});
};

// search solr server with query passed
var search = function(query, callback){
	var query = tweetClient.createQuery().q(query);
	var results = {};

	tweetClient.search(query, function(err, obj){
		if(err){
			console.log(err);
		} else {
			results.tweets = obj.response.docs;

			celebClient.search(query, function(err, obj){
				if(err){
					console.log(err);
				} else {
					results.celebs = obj.response.docs;
				}

				callback(results);
			});
		}
	});
};

// get celebrity data by sreen_name
var getCeleb = function(celebrities, callback){
	if(celebrities.constructor != Array){
		celebrities = ['' + celebrities];
	}

	var querystring = '';
	for(var i = 0; i < celebrities.length; i++){
		if(i > 0){
			querystring = querystring+ " OR ";
		}

		querystring = querystring+ "screen_name:" + celebrities[i];
	}

	var query = celebClient.createQuery().q(querystring);

	celebClient.search(query, function(err, obj){
		if(err){
			console.log(err);
		} else {
			callback(obj.response.docs);
		}
	});
};

// get celebrity data by categories
var getCategoryCelebs = function(categories, callback){
	if(categories.constructor != Array){
		categories = [categories+''];
	}

	var querystring = '';
	for(var i = 0; i < categories.length; i++){
		if(i > 0){
			querystring = querystring+ " OR ";
		}

		querystring = querystring+ "categories:" + categories[i];
	}

	var query = celebClient.createQuery().q(querystring).rows(20);

	celebClient.search(query, function(err, obj){
		if(err){
			console.log(err);
		} else {
			console.log("Found celebs");
			callback(obj.response.docs);
		}
	});
};

module.exports.addCelebsFromFile = addCelebsFromFile;
module.exports.getCeleb = getCeleb;
module.exports.getTweets = getTweets;
module.exports.getCategoryTweets = getCategoryTweets;
module.exports.getCategoryCelebs = getCategoryCelebs;
module.exports.addCeleb = addCeleb;
module.exports.addTweet = addTweet;
module.exports.addUserTimeline = addUserTimeline;
module.exports.search = search;