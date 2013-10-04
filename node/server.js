var express = require('express'),
	app = express(),
	http = require('http'),
	twitterClass = require('./twitter.js'),
	server = http.createServer(app),
	io = require('socket.io').listen(server),
	util = require('util'),
	twitter = require('twitter'),
	solr = require('solr-client');

var celebClient = solr.createClient("127.0.0.1", "8983", "celebrities");
var tweetClient = solr.createClient("127.0.0.1", "8983", "tweets");
var twit = new twitter({
	consumer_key: 'qU9BHvWtKrLFKITu0bgA',
	consumer_secret: '7YVdmU8NGJTSABNjMfaigx8N25Ls5zH1suuWfwGNDY',
	access_token_key: '351051971-X0ShaGSHzNK1CIA2p3BeZp7nUNkd9C2JQIJdSpkZ',
	access_token_secret: 'F40rRpM9vXQTMpCySuTRyrxIC7oU7EubL0jXy65fcos'
});

twitterClass.getCeleb("bacon");

tweetClient.autoCommit = true;
celebClient.autoCommit = true;

// open stream, that serve the data to the solr server
app.use(express.static(__dirname + '../../frontend'));
server.listen(1337);

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

app.get("/celeb", function(req, res){
	if(req.query.category){
		var category = req.query.category;
		var query = celebClient.createQuery().q({ categories : category});
	} else if(req.query.screen_name){
		var screen_name = req.query.screen_name;
		var query = celebClient.createQuery().q({ screen_name : screen_name });
	}

	celebClient.search(query, function(err, obj){
		if(err){
			console.log(err);
		} else {
			res.send(obj.response);
		}
	});
});

app.get("/tweetViews", function(req, res){
	var tweetIds = req.query.tweetIds;
	var length = tweetIds.length;
	for(var i = 0; i < length; i++){
		twit.get('/statuses/oembed.format', { id: tweetIds[i] }, function(data){
			console.log(data);
		});
	}
});

app.get("/categoryTweets", function(req, res){
	var category = null;

	if(req.query.category.constructor == Array){

	} else {
		var category = req.query.category;
		var celebQuery = celebClient.createQuery().q( { categories: category } );

		celebClient.search(celebQuery, function(err, obj){
			if(err){
				console.log(err);
			} else {
				var docs = obj.response.docs;
				var length = docs.length;

				var querystring = '';
				for(var i = 0; i < length; i++){
					if(i > 0){
						querystring = querystring+ " OR ";
					}

					querystring = querystring+ "screen_name:" + docs[i].screen_name;
				}
				var query = tweetClient.createQuery().q(querystring).rows(20);

				tweetClient.search(query, function(err, obj){
					if(err){
						console.log(err);
					} else {
						res.send(obj.response);
					}
				})
			}
		})
	}
});

app.get("/tweets", function(req, res){
	if(req.query.category){
		var category = req.query.category;
		var query = tweetClient.createQuery().q({ categories: category });

	} else if(req.query.screen_name){
		if(req.query.screen_name.constructor == Array){
			var screen_names = req.query.screen_name;
			var querystring = '';
			for(var i = 0; i < screen_names.length; i++){
				if(i > 0){
					querystring = querystring+ " OR ";
				}

				querystring = querystring+ "screen_name:" + screen_names[i];
			}
			console.log(querystring);

			var query = tweetClient.createQuery().q(querystring).rows(20);
		} else {
			var screen_name = req.query.screen_name;
			var query = tweetClient.createQuery().q({ screen_name: screen_name });
		}
		
		tweetClient.search(query, function(err, obj){
			if(err){
				console.log(err);
			} else {
				console.log(util.inspect(obj));
				res.send(obj.response);
			}
		});
	}
});

io.sockets.on('connection', function(socket){
	socket.emit('news', { hello: 'world' });

	socket.on('categoryStream', function(data){

	});

	socket.on('celebStream', function(data){
		var celebIds = [];
		if(data.celebId.constructor == Array){
			var length = data.celebIds.length;
			for(var i = 0; i < length; i++){
				celebIds.push(parseInt(data.celebIds[i]));
			}
		} else {
			celebIds.push(parseInt(data.celebId));
		}
		// TODO getCelebrities

		twit.stream('statuses/filter', {follow: celebIds}, function(stream){
			stream.on('data', function(data){
				if (data.retweet_count !== undefined && data.retweet_count !== null) {
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

					socket.emit('tweet', solrTweetData);					
				};
			})
		})
	});
});

/*
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
