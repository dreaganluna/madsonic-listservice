var init = function()
{
	// startup Restify server
	var server = Restify.createServer({'name': 'madsonic-listservice'});
	server.use(Restify.fullResponse());
	server.use(Restify.bodyParser());
	server.use(Restify.queryParser());

	server.on("uncaughtException", onUncaughtException);
	server.use(mainHandler);

	server.post("/artists/toptracks", createArtistsTopTracksList);

	server.listen(config.port, serverUpHandler);

	Winston.info("Server listening through port " + config.port + ".");
}

var mainHandler = function(request, result, next)
{
	// recreate url
	Winston.verbose(request.method + ": " + request.url);
	next();
};

var onUncaughtException = function(request, response, route, err)
{
	Winston.error("Uncaught Exception:\n", err);
	response.send(err); // Resume default behaviour.
}

var serverUpHandler = function()
{
	Winston.log('info', 'Restify server up and running on port ' + config.port);
};


// ================== //
// HANDLER FUNCTIONS: //
// ================== //

var createArtistsTopTracksList = function(request, response, next)
{
	var allSongs = [];
	Async.each(request.body.artists, function(artist, callback)
	{
		getArtistTopTracks(artist, function(err, tracks)
		{
			var allTracks = tracks;
			getSongsForLastFmTracks(allTracks, function(err, songs)
			{
				if(err) return callback(err);

				songs.forEach(function(song)
				{
					allSongs.push(song);
				});

				callback();
			});
		});

	},
	function(err)
	{
		if(err) return response.send(err);

		createList(request.body.listName, allSongs, function(err)
		{
			if(err) return response.send(err);
			response.send(200);
		});
	});

	next();
};

var getArtistTopTracks = function(artist, callback)
{
	var options = JSON.parse(JSON.stringify(_httpOptions));
	options.url = config.api.lastfmservice.location;
	var client = Restify.createJSONClient(options);

	var endpoint = '/artist/toptracks?artist=' + encodeURIComponent(artist) + '&limit=10';

	Winston.info("Calling API with url: " + endpoint);
	client.get(endpoint, function(err, req, resp, object)
	{
		callback(err, object);
	});
};

var getSongsForLastFmTracks = function(lastFmTracks, callback)
{
	// prepare request
	var options = JSON.parse(JSON.stringify(_httpOptions));
	options.url = config.api.songservice.location;
	var client = Restify.createJSONClient(options);

	// call songService for each track
	var songs = [];
	Async.each(lastFmTracks, function(track, callback)
	{
		var endpoint = '/search?artist=' + encodeURIComponent(track.artist.name) + "&song=" + encodeURIComponent(track.name);

		Winston.info("Calling API with url: " + endpoint);
		client.get(endpoint, function(err, req, resp, object)
		{
			if(err && resp.statusCode != 404) return callback(err);

			if(resp.statusCode != 404) songs.push(object);
			callback();
		});
	},
	function(err)
	{
		callback(err, songs)
	});
};

var createList = function(name, songs, callback)
{
	// prepare rest call
	var options = JSON.parse(JSON.stringify(_httpOptions));
	options.url = config.api.madsonic.location;
	var client = Restify.createJSONClient(options);

	var endpoint = '/rest2/createPlaylist.view';
	endpoint += '?v=2.5.0&c=work-pc-rest&f=json&u=' + config.api.madsonic.user;
	endpoint += '&p=' + config.api.madsonic.pass;
	endpoint += '&name=' + encodeURIComponent(name);

	// loop through songs to add to the query
	var i = 0, iLen = songs.length;
	for(i; i < iLen; i++)
	{
		endpoint += "&songId=" + songs[i].id;
	}

	// call madsonic
	Winston.info("Calling API with url: " + endpoint);
	client.get(endpoint, function(err, req, resp, object)
	{
		if(!err) Winston.info("List created.");
		callback(err);
	});
};

// init requirements:
var Async   = require('async');
var Restify = require('restify');
var Winston = require("./node_logging/logger.js")("madsonic-listservice");

// config
var config = require('./config.json');
Winston.info('Started with the following config:\n', JSON.stringify(config));

// init vars
var _httpOptions = {
	headers: {
		"Content-Type": "application/json"
	},
	retry: {
	'retries': 0
	},
	agent: false
};

init();