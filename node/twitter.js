var twitter = require('twitter'),
	solr = require('solr-client'),
	util = require('util');

var twit = new twitter({
	consumer_key: 'qU9BHvWtKrLFKITu0bgA',
	consumer_secret: '7YVdmU8NGJTSABNjMfaigx8N25Ls5zH1suuWfwGNDY',
	access_token_key: '351051971-X0ShaGSHzNK1CIA2p3BeZp7nUNkd9C2JQIJdSpkZ',
	access_token_secret: 'F40rRpM9vXQTMpCySuTRyrxIC7oU7EubL0jXy65fcos'
});

var tweetClient = solr.createClient("127.0.0.1", "8983", "tweets");

exports.getCelebData = function(screen_name, callback){
	twit.showUser(screen_name, function(data, err){
		if(err){
			console.log(err);
		} else {
			if(data.constructor == TypeError){
				console.log("Error: No callback specified");
			} else {
				callback(data);
			}
		}
	});
};

exports.getUserTimeline = function(params, callback){
	twit.getUserTimeline(params, function(_data, err){
		callback(_data);
	});
};

exports.openCelebStream = function(userIds, callback){
	if(!(userIds.constructor == Array)){
		var userIds = [parseInt(userIds)];
	}

	twit
		.stream('statuses/filter', userIds, function(stream){
			stream.on('data', function(data){
				if(data.retweet_count !== undefined && data.retweet_count !== null){
					console.log(util.inspect(data));

					var tweet = data;
					var solrTweetData = {
						"createdAt": tweet.created_at,
						"id": tweet.id,
						"text": tweet.text,
						"retweet_count": tweet.retweet_count,
						"favorite_count": tweet.favorite_count,
						"userId": tweet.user.id,
						"userName": tweet.user.name,
						"screenName": tweet.user.screen_name
					};

					callback(data);
				}
			});
		});
};