// syntactic sugar
Array.prototype.removeElement = function(element) {
	var pos = this.indexOf(element);
	if(pos != -1)
		this.splice(pos, 1);
};

//stuff
function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
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
	this.player2 = _player2;	

	this.cardsbanned = 2;
	this.roundStep = 2;	

	this.actionQueue = [];

	this.getOpponent = function(player) {
		if(this.player1 == player)
			return this.player2;
		return this.player1;
	}
}

var totalGameNumber = 0;
var totalPlayersConnected = 0;

var games = [];
var players = [];
var waitingPlayers = [];

// require 
var path = require('path'),
	express = require('express'),	
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
	//console.log('New user connected.'.bold.green);

	totalPlayersConnected++;
	if(totalPlayersConnected % 5 == 0){
		console.log("Stats, Players: "+totalPlayersConnected+" Games: "+totalGameNumber);
	}

	var thisPlayer = new Player(socket);
	players.push(thisPlayer);	

	socket.on('searchForGame', function(data){										
		players.removeElement(thisPlayer);
		waitingPlayers.removeElement(thisPlayer);

		thisPlayer.deck = data.deck;		
		thisPlayer.targetRoom = data.room;
		
		for(var i = 0; i < waitingPlayers.length; i++)
			if(waitingPlayers[i].targetRoom == thisPlayer.targetRoom) {
				//console.log("Found opponent, starting game".bold.green);			

				var player = waitingPlayers[i];
				waitingPlayers.splice(i, 1);				

				var game = new Game("game_"+(totalGameNumber++), thisPlayer, player);
				player.game = game;
				thisPlayer.game = game;

				player.myId = 0;
				thisPlayer.myId = 1;

				player.socket.join(game.room);
				thisPlayer.socket.join(game.room);				

				player.socket.emit("gameStarted", {myId : 0, roomName : game.room, deck : thisPlayer.deck});			
				thisPlayer.socket.emit("gameStarted", {myId : 1, roomName : game.room, deck : player.deck});							

				return;
			}			

		//console.log("Waiting for opponent in room "+thisPlayer.targetRoom+"...");
		waitingPlayers.push(thisPlayer);	
	});	

	socket.on("game_action_ready", function(minionsOnBoard){		
		var game = thisPlayer.game;
		var opponent = game.getOpponent(thisPlayer);
		thisPlayer.myMinions = minionsOnBoard;

		game.roundStep--;
		if(game.roundStep <= 0) {						
			game.roundStep = 2;

			var player0 = thisPlayer;
			var player1 = opponent;

			if(player0.myId == 1)
				player0 = [player1, player1 = player0][0];

			//DEEP COPY FOR SIMULATION
			var p0Minions = [];
			var p1Minions = [];
			var joinedMinions = [];
			var actionsLog = [];	

			for(var i = 0; i < player0.myMinions.length; i++)
				p0Minions.push({player : player0.myMinions[i].player,
								image  : player0.myMinions[i].image,
								name   : player0.myMinions[i].name,
								life   : player0.myMinions[i].life,
								attack : player0.myMinions[i].attack});
			for(var i = 0; i < player1.myMinions.length; i++)
				p1Minions.push({player : player1.myMinions[i].player,
								image  : player1.myMinions[i].image,
								name   : player1.myMinions[i].name,
								life   : player1.myMinions[i].life,
								attack : player1.myMinions[i].attack});						

			//JOIN MINIONS
			for(var i = 0; i < p0Minions.length; i++)
				joinedMinions.push(p0Minions[i]);
			for(var i = 0; i < p1Minions.length; i++)
				joinedMinions.push(p1Minions[i]);

			joinedMinions = shuffle(joinedMinions);
			//simulate			
			for(var i = 0; i < joinedMinions.length; i++) {
				var minion = joinedMinions[i];
				if(minion.life > 0 && minion.attack > 0) {

					var chance = 0;
					var counter = 0;
					var selMinion = null;

					while(counter < joinedMinions.length){
						if(joinedMinions[counter].player != minion.player &&
						   joinedMinions[counter].life > 0 && 
						   Math.random() < 1.0 / ++chance)
							selMinion = joinedMinions[counter];
						counter++;
					}

					if(Math.random() < 1.0 / ++chance)
						selMinion = null;

					if(selMinion != null) {
						selMinion.life -= minion.attack;
						minion.life -= selMinion.attack;
					}

					actionsLog.push({target : selMinion, agressor : minion});
				}
			}			

			io.to(game.room).emit("nextRound", 
				{player0    : {id : 0, minions : player0.myMinions},
				 player1    : {id : 1, minions : player1.myMinions},
				 actionsLog : actionsLog});
		}
	});

	socket.on("cardsBanned", function(list){
		var game = thisPlayer.game;
		var opponent = game.getOpponent(thisPlayer);
		opponent.bannedCards = list;		

		game.cardsbanned--;		

		if(game.cardsbanned <= 0){			

			opponent.socket.emit("fireTheActualGame", opponent.bannedCards);
			thisPlayer.socket.emit("fireTheActualGame", thisPlayer.bannedCards);			
			
		}
	});

	socket.on('reconnect', function(){
		//console.log('Reconnected'.bold.green);
	});

	socket.on("gameFinished", function(){
		thisPlayer.game = null;
		thisPlayer.myMinions = [];
	});

	socket.on('disconnect', function(){
		//console.log('User disconnected'.bold.red);

		if(thisPlayer.game != null)
			io.to(thisPlayer.game.room).emit("connectionBroken");
		thisPlayer.game = null;

		players.removeElement(thisPlayer);
		waitingPlayers.removeElement(thisPlayer);
	});
});