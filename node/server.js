var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	util = require('util'),
	twitter = require('twitter'),
	io = require('socket.io').listen(server),
	solr = require('solr-client');

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

// open stream, that serve the data to the solr server
app.use(express.static(__dirname + '../../frontend'));


app.get("/addCeleb", function(req, res){
	var screen_name = req.query.screen_name;
	var categories = req.query.categories;

	twit.showUser(screen_name, function(data, err){
		if(err){
			console.log(err);
		} else {
			console.log(util.inspect(data));
			var celeb = {
				"name": data.name,
				"screen_name": data.screen_name,
				"id": data.id_str,
				"created_at": data.created_at,
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
			}

			console.log(util.inspect(celeb));

			celebClient.add(celeb, function(err, obj){
				if(err){
					console.log(err);
				} else {
					console.log(obj);
				}
			});
		}
	})	
});

app.get("/celebs", function(req, res){
	var category = req.query.category;

	var query = celebClient.createQuery().q({ categories : category});
	celebClient.search(query, function(err, obj){
		if(err){
			console.log(err);
		} else {
			console.log(obj);
			res.send(obj);
		}
	});
});

app.get("/categoryTweets", function(req, res){

});

app.get("/celebTweets", function(req, res){

});


io.sockets.on('connection', function(socket){
	socket.emit('news', { hello: 'world' });

	socket.on('categoryStream', function(data){

	});

	socket.on('celebStream', function(data){

	});
});
 
/*
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
	}); */

server.listen(1337);