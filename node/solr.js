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

var addCelebsFromFile = function(path, startWith){
	readCelebsFromFile(path, startWith, function(data){
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

var readCelebsFromFile = function(path, startWith, callback){
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
				}
			}
		}

		callback(data);
	});
}

var readScreenNamesFromFile = function(path, startWith, callback){
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

		var screen_names = [];
		for(var i = 0; i < lines.length; i++){
			if(lines[i].substring(0, 2).indexOf("\t") != -1){

				var line = lines[i].split(/\]\,\s*\[/);
				for(var item = 0; item < line.length; item++){
					screen_names.push(line[item].split(/\,\s*/)[1]);
				}
			}
		}

		if(startWith){
			screen_names = screen_names.slice(screen_names.indexOf(startWith), screen_names.length);
		}

		callback(screen_names);
	});
};

var addCeleb = function(screen_name, categories){
	twitter.getCelebData(screen_name, function(data){
		if(data.created_at){
			var date = parseTwitterDate(data.created_at).toISOString();
		} else {
			var date = data.created_at;
		}

		var celeb = {
			"name": data.name,
			"screen_name": data.screen_name,
			"id": data.id_str,
			"created_at": date,
			"profile_image_url": data.profile_image_url,
			"location": data.location,
			"favourites_count": data.favourites_count,
			"listed_count": data.listed_count,
			"protected": data.protected,
			"lang": data.lang,
			"verified": data.verified,
			"friends_count": data.friends_count,
			"statuses_count": data.statuses_count,
			"url": data.url,
			"followers_count": data.followers_count,
			"categories": categories
		};

		celebClient.add(celeb, function(err, obj){
			if(err){
				console.log(err);
			} else {
				console.log(obj);
			}
		});
	});
};

var addCelebTweets = function(startWith){
	readScreenNamesFromFile(__dirname + '../../frontend/listen.txt', startWith, function(celebs){
		var counter = 0;
		_und.each(celebs, function(screenName){
			counter++;
			setTimeout(function(){
				addUserTimeline(screenName, 100);
			}, counter* TIME_BETWEEN_TWITTER_API_CALLS);
		});
	});
};

var addUserTimeline = function(screen_name, count){
	var params = {};
	params.screen_name = screen_name;
	if(count){
		params.count = parseInt(count);
	}

	twitter.getUserTimeline(params, function(_data){
		console.log(_data);
		for(var i = 0; i < _data.length; i++){
			addTweet(_data[i]);			
		}
	});
};

var addTweet = function(data){
	if(data.created_at){
		var date = parseTwitterDate(data.created_at).toISOString();
	} else {
		var date = data.created_at;
	}

	var hashtags = [];
	if(data.entities.hashtags.length != 0){
		for(var i = 0; i < data.entities.hashtags.length; i++){
			hashtags.push(data.entities.hashtags[i].text);
		}
	}

	console.log(hashtags);

	var tweet = {
		created_at: date,
		id: data.id_str,
		retweet_count: data.retweet_count,
		favorite_count: data.favorite_count,
		user_id: data.user.id_str,
		user_name: data.user.name,
		screen_name: data.user.screen_name,
		profile_image_url: data.user.profile_image_url,
		text: data.text,
		hashtags: hashtags
	};

	tweetClient.add(tweet, function(err, obj){
		if(err){
			console.log(err);
		} else {
			console.log(obj);
		}
	});
};

var getTweets = function(params, callback){
	var query = buildQuery(tweetClient, {
		words: params.screen_name,
		search: params.search,
		field: "screen_name",
		start: params.start,
		rows: params.rows
	});

	tweetClient.search(query, function(err, obj){
		if (err) {
			console.log(err);
		} else {
			callback(obj.response.docs);
		}
	});
};

var getCategoryTweets = function(params, callback){
	if(params.category == '*'){
		var query = buildQuery(tweetClient, {
			words: '*',
			field: "screen_name",
			search: params.search,
			start: params.start,
			rows: params.rows,
			sort: {created_at: "desc"}
		});
		tweetClient.search(query, function(err, obj){
			if(err){
				console.log(err);
			} else {
				callback(obj.response.docs);
			}
		});
	} else {
		getCategoryCelebs({category: params.category, rows: 300}, function(celebs){
			var screen_names = [];
			for(var i = 0; i < celebs.length; i++){
				screen_names.push(celebs[i].screen_name);
			}

			var query = buildQuery(tweetClient, {
				words: screen_names,
				field: "screen_name",
				search: params.search,
				start: params.start,
				rows: params.rows,
				sort: {created_at: "desc"}
			});

			tweetClient.search(query, function(err, obj){
				if(err){
					console.log(err);
				} else {
					callback(obj.response.docs);
				}
			});
		});	
	}
	
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

var extractScreenNames = function(data){
	var screen_names = [];
	for(var i = 0; i < data.length; i++){
		screen_names.push(data[i].screen_name);
	}
	return screen_names;
};

// get celebrity data by sreen_name
var getCeleb = function(params, callback){
	var query = buildQuery(celebClient, {
		words: params.screen_name,
		search: params.search,
		field: "screen_name",
		start: params.start,
		rows: params.rows
	});

	celebClient.search(query, function(err, obj){
		if(err){
			console.log(err);
		} else {
			callback(obj.response.docs);
		}
	});
};

// get celebrity data by categories
var getCategoryCelebs = function(params, callback){
	if(!params.category){
		params.category = "*";
	}

	var query = buildQuery(celebClient, {
		words: params.category,
		field: "categories",
		search: params.search,
		start: params.start,
		rows: params.rows,
		sort: {name: "asc"}
	});

	celebClient.search(query, function(err, obj){
		if(err){
			console.log(err);
		} else {
			callback(obj.response.docs);
		}
	});
};

var parseTwitterDate = function(date){   
  return new Date(Date.parse(date.replace(/( \+)/, ' UTC$1')));
};

var buildQuery = function(client, params){
	console.log(util.inspect(params));
	if(params.words == '' || params.words == null || params.words.length == 0){
		params.words = "*";
	}
	if(params.words.constructor != Array){
		params.words = [params.words+''];
	}

	var querystring = '';
	var screenNameFilter = '';
	var hashtagFilter = '';
	for(var i = 0; i < params.words.length; i++){
		if(i > 0){
			querystring = querystring+ " OR ";
		}

		querystring = querystring+ params.field + ":" + params.words[i];
	}

	if(params.search){
		if(querystring != ''){
			var tokens = params.search.split(" ");
			var remainingTokens = [];

			for(var i = 0; i < tokens.length; i++){
				if(tokens[i].charAt(0) == '@'){
					if(screenNameFilter == ''){
						screenNameFilter += tokens[i].substring(1, tokens[i].length);
					} else {
						screenNameFilter += " OR " + tokens[i].substring(1, tokens[i].length);
					}
				} else if(tokens[i].charAt(0) == '#'){
					if(hashtagFilter == ''){
						hashtagFilter += tokens[i].substring(1, tokens[i].length);
					} else {
						hashtagFilter += " OR " + tokens[i].substring(1, tokens[i].length);
					}
				} else {
					remainingTokens.push(tokens[i]);
				}
			}
			if(screenNameFilter.length > 0){
				screenNameFilter = "(" + screenNameFilter + ")";
			}
			if(hashtagFilter.length > 0){
				hashtagFilter = "(" + hashtagFilter + ")";
			}

			remainingTokens = remainingTokens.join(" ");

			if(remainingTokens){
				querystring = "(" + querystring + ") AND text:" + remainingTokens;
			}
		} else {
			querystring = params.search;
		}
	}

	var rows = params.rows || 25;
	var start = params.start || 0;
	var query = client.createQuery().q(querystring).start(start).rows(rows);

	if(params.sort){
		query.sort(params.sort);
	}
	if(screenNameFilter != ''){
		query.matchFilter("screen_name", screenNameFilter);
	}
	if(hashtagFilter != ''){
		query.matchFilter("hashtags", hashtagFilter);
	}

	return query;
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
module.exports.addCelebTweets = addCelebTweets;