// syntactic sugar
Array.prototype.removeElement = function(element) {
	var pos = this.indexOf(element);
	if(pos != -1)
		this.splice(pos, 1);
};


// model

function Player(_socket) {
	this.socket = _socket;
	this.deck = [];
	this.game = null;
}

function Game(_room, _player1, _player2) {
	this.room = _room;
	this.player1 = _player1;
	this.player1.game = this;

	this.player2 = _player2;
	this.player2.game = this;

}

var totalGameNumber = 0;

var games = [];
var players = [];
var waitingPlayers = [];

// require 
var path = require('path'),
	express = require('express'),
	color = require('colors'),
	app = express(),
	http = require('http'),
	server = http.createServer(app),
	io = require('socket.io').listen(server);

// routing
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/public/game.html');
});

var port = process.env.PORT || 8080;
server.listen(port,
	function(){
		console.log("Node app is running at localhost: "+port);
	});

// actions
io.sockets.on('connection', function(socket) {
	console.log('New user connected.'.bold.green);

	var thisPlayer = new Player(socket);
	players.push(thisPlayer);

	socket.on('searchForGame', function(deck){										
		players.removeElement(thisPlayer);
		thisPlayer.deck = deck;


		if(waitingPlayers.length > 0) {
			console.log("Found opponent, starting game".bold.green);

			var player = waitingPlayers.pop();

			var game = new Game("game_"+(totalGameNumber++), thisPlayer, player);

			player.socket.join(game.room);
			thisPlayer.socket.join(game.room);

			player.socket.emit("gameStarted", deck);			
			thisPlayer.socket.emit("gameStarted", player.deck);			
		} else {
			console.log("Waiting for opponent...");

			waitingPlayers.push(thisPlayer);
		}		
	});

	socket.on('reconnect', function(){
		console.log('Reconnected'.bold.green);
	});

	socket.on('disconnect', function(){
		console.log('User disconnected'.bold.red);

		players.removeElement(thisPlayer);
		waitingPlayers.removeElement(thisPlayer);
	});
});