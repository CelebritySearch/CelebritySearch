var express = require('express'),
	app = express(),
	http = require('http'),
	twitter = require('./twitter.js'),
	solr = require('./solr.js'),
	server = http.createServer(app),
	util = require('util');

// open stream, that serve the data to the solr server
app.use(express.static(__dirname + '../../frontend'));
server.listen(1337);

app.get("/addCeleb", function(req, res){
	var screen_name = req.query.screen_name;
	var categories = req.query.categories;

	twitter.addCeleb(screen_name, categories);
});

app.get("/addUserTimeline", function(req, res){
	solr.addUserTimeline(req.query.name, req.query.count);
});

app.get("/addCelebsFromFile", function(req, res){
	solr.addCelebsFromFile(__dirname + '../../frontend/listen.txt');
	res.end();
});

app.get("/addCelebTweets", function(req, res){
	if(req.query.startWith){
		solr.addCelebTweets(req.query.startWith);
	} else {
		solr.addCelebTweets();
	}
});

app.get("/celeb", function(req, res){
	var params = {};
	params.start = req.query.start;
	params.search = req.query.search || null;

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
	} else {
		res.send([]);
	}
});

app.get("/tweets", function(req, res){
	var params = {};
	params.start = req.query.start || 0;
	params.search = req.query.search || null;

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
	} else {
		res.send([]);
	}
});