var express = require('express'),
	util = require('util'),
	twitter = require('twitter'),
	solr = require('solr-client');

var app = express();
var celebClient = solr.createClient("127.0.0.1", "8983", "celebrities");
var tweetClient = solr.createClient("127.0.0.1", "8983", "tweets");
var twit = new twitter({
	consumer_key: 'qU9BHvWtKrLFKITu0bgA',
	consumer_secret: '7YVdmU8NGJTSABNjMfaigx8N25Ls5zH1suuWfwGNDY',
	access_token_key: '351051971-X0ShaGSHzNK1CIA2p3BeZp7nUNkd9C2JQIJdSpkZ',
	access_token_secret: 'F40rRpM9vXQTMpCySuTRyrxIC7oU7EubL0jXy65fcos' 
});

tweetClient.autoCommit = true;
celebClient.autoCommit = true;

tweetClient.add({
	"id": "213432",
	"text": "Hi, i am some text",
	"screen_name": "blackcookiejar",
	"user_name": "blackcookiejar"
}, function(err, obj){
	if (err) {
		console.log(err);
	} else {
		console.log(obj);
	}
});

celebClient.add({
	"name": "Teh Baconator",
	"id": 123,
	"categories": ["Sportler", "Schauspieler"]
}, function(err, obj){
	if (err) {
		console.log(err);
	} else {
		console.log(obj);
	}
});

celebClient.add({
	"name": "The Baconator",
	"screen_name": "thebaconator",
	"id_str": "39487293847",
	"id": 123123123,
	"created_at": "sometime",
	"profile_image_url": "some.url.to/the/image.png"
}, function(err, obj){
	if(err){
		console.log(err);
	} else {
		console.log(obj);
	}
});

twit.getUserTimeline({
		screen_name: 'blackcookiejar',
		count: 11,
		include_rts: 1
	}, function(data, err){
		for(var i = 0; i < data.length; i++){
			var tweet = data[i];
			var solrTweetData = {
				"created_at": tweet.created_at,
				"id": tweet.id,
				"text": tweet.text,
				"retweet_count": tweet.retweet_count,
				"favorite_count": tweet.favorite_count,
				"user_id": tweet.user.id,
				"user_name": tweet.user.name,
				"screen_name": tweet.user.screen_name
			};

			tweetClient.add(solrTweetData, function(err, obj){
				if(err){
					console.log(err);
				} else {
					console.log(obj);
				}
			});
		}
	});

twit
	.stream('statuses/filter', {follow: [351051971]}, function(stream){
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

				tweetClient.add(solrTweetData, function(err, obj){
					if(err){
						console.log(err);
					} else {
						console.log(obj);
					}
				});
			}
		});
	});

app.listen(1337);