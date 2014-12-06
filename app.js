// syntactic sugar
Array.prototype.removeElement = function(element) {
	var pos = this.indexOf(element);
	if(pos != -1)
		this.splice(pos, 1);
};


// model
function Card(_name, _cost) {	
	this.name = _name;
	this.cost = _cost;
}

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

	socket.on('searchForGame', function(){				
		if(waitingPlayers.size() > 0) {
			var player = waitingPlayers.pop();
			var game = new Game("game_"+(totalGameNumber++), thisPlayer, player);

			player.socket.join(game.room);
			thisPlayer.socket.join(game.room);

			io.socket.in(game.room).emit("gameStarted", {oponent : player});			
		} else {
			waitingPlayers.push(player1);
		}		
	});

	socket.on('disconnect', function(){
		console.log('User disconnected'.bold.red);

		players.removeElement(thisPlayer);
		waitingPlayers.removeElement(thisPlayer);
	});
});