var express = require('express'),
	util = require('util'),
	twitter = require('twitter'),
	solr = require('solr-client');

var app = express();
var client = solr.createClient();
var twit = new twitter({
	consumer_key: 'qU9BHvWtKrLFKITu0bgA',
	consumer_secret: '7YVdmU8NGJTSABNjMfaigx8N25Ls5zH1suuWfwGNDY',
	access_token_key: '351051971-X0ShaGSHzNK1CIA2p3BeZp7nUNkd9C2JQIJdSpkZ',
	access_token_secret: 'F40rRpM9vXQTMpCySuTRyrxIC7oU7EubL0jXy65fcos' 
});

client.autoCommit = true;

twit
	// .verifyCredentials(function(data){
	// 	console.log(util.inspect(data));
	// })
	.getUserTimeline({
		screen_name: 'blackcookiejar',
		count: 10,
		include_rts: 1
	}, function(data, err){
		for(var i = 0; i < data.length; i++){
			var tweet = data[i];
			client.add({
				"createdAt": tweet.created_at,
				"id": tweet.id,
				"text": tweet.text,
				"retweet_count": tweet.retweet_count,
				"favorite_count": tweet.favorite_count,
				"userId": tweet.user.id,
				"userName": tweet.user.name,
				"screenName": tweet.user.screen_name
			}, function(err, obj){
				if(err){
					console.log(err);
				} else {
					console.log(obj);
				}
			});
		}
	});

twit
	.stream('blackcookiejar', {track: 'nodejs'}, function(stream){
		stream.on('data', function(data){
			console.log(data);
		});
	});

app.listen(1337);