var express = require('express'),
	app = express(),
	http = require('http'),
	twitter = require('./twitter.js'),
	solr = require('./solr.js'),
	server = http.createServer(app),
	io = require('socket.io').listen(server),
	util = require('util');

// open stream, that serve the data to the solr server
app.use(express.static(__dirname + '../../frontend'));
server.listen(1337);

app.get("/addCeleb", function(req, res){
	var screen_name = req.query.screen_name;
	var categories = req.query.categories;

	twitter.addCeleb(screen_name, categories);
});

app.get("/addCelebsFromFile", function(req, res){
	solr.addCelebsFromFile(__dirname + '../../frontend/listen.txt');
	res.end();
});

app.get("/startMonitoringTwitter", function(req, res){

});

app.get("/celeb", function(req, res){
	var params = {};
	params.start = req.query.start;

	if(req.query.category){
		params.category = req.query.category;
		solr.getCategoryCelebs(params, function(celebs){
			res.send(celebs);
		});
	} else if(req.query.screen_name){
		params.screen_name = req.query.screen_name;
		solr.getCeleb(params, function(celeb){
			res.send(celeb);
		});
	}
});

app.get("/tweets", function(req, res){
	var params = {};
	params.start = req.query.start || 0;

	if(req.query.category){
		params.category = req.query.category;
		solr.getCategoryTweets(params, function(tweets){
			res.send(tweets);
		});
	} else if(req.query.screen_name){
		params.screen_name = req.query.screen_name;
		solr.getTweets(params, function(tweets){
			res.send(tweets);
		});
	}
});

app.get("/search", function(req, res){
	if(req.query.text){
		solr.search(req.query.text, function(data){
			res.send(data);
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
