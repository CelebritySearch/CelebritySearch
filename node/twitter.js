var twitter = require('twitter');

var twit = new twitter({
	consumer_key: 'qU9BHvWtKrLFKITu0bgA',
	consumer_secret: '7YVdmU8NGJTSABNjMfaigx8N25Ls5zH1suuWfwGNDY',
	access_token_key: '351051971-X0ShaGSHzNK1CIA2p3BeZp7nUNkd9C2JQIJdSpkZ',
	access_token_secret: 'F40rRpM9vXQTMpCySuTRyrxIC7oU7EubL0jXy65fcos'
});

exports.getCeleb = function(screen_name){
	console.log("getting celeb " + screen_name);
};