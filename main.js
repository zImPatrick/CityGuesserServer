const io = require('socket.io')(6969);
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');

class Room extends EventEmitter {
	onAnyEvent = []
	players = []
	current_round = 0
	settings = {
		timePerGame: 1, // Minuten
		tpgString: "",
		rounds: 1, // Runden
	}
	endRoundTimeout = 0

	constructor(roomId) {
		super();
		this.roomId = roomId;
	}

	joinPlayer(playerClass, socket) {
		this.players.push(playerClass);
		this.onAnyEvent.push((event, ...args) => {
			socket.emit(event, ...args);
		});

		this.emitNumOfPlayers();
	}

	onAny(cb) {
		this.onAnyEvent.push(cb);
	}

	emit(event, ...args) {
		this.onAnyEvent.map(e => e(event, ...args));
		super.emit(event, ...args);
	}

	emitNumOfPlayers() {
		this.emit('change-num-of-players', {
			room_list: this.players.reduce(
				(previous, player) => ({ ...previous, [player.socketId]: player.username}),
				 {}
			),
		})
	}

	removePlayer(socketId) {
		let index = this.players.findIndex(e => e.socketId === socketId);
		if (index != -1) {
			this.players.splice(index, 1);
			this.emitNumOfPlayers();
		}

		if (this.players.length == 0) {
			console.log("Shutting down room, no players left")
			rooms.splice(rooms.indexOf(this), 1);
			delete this;
		}
	}

	startNewRound(host_round) {
		clearTimeout(this.endRoundTimeout);
		this.current_round = host_round;

		let player_info = {};
		for (let player of this.players) {
			player.has_guessed_this_round = false;
			player_info[player.socketId] = [player.username, player.score, 0x696969]
		}
		
		let socketsThingy = {};
		for (let i = 0; i < this.players.length; i++) {
			socketsThingy[i] = 0;
		}

		this.emit("start-game-notify", {
			rounds: this.settings.rounds,
			t_p_g: this.settings.tpgString,
			current_round: this.current_round,
			random_num: Math.floor(Math.random() * 965), // Es sind 966 Videos in der Liste (pushen wir mehr mit Userscript?)

			player_info: player_info,
			room_contents: {
				sockets: socketsThingy
			}
		});
		console.log(this.settings);
		console.log("Ending round in ", this.settings.timePerGame * 60 * 1000 + 4000, "ms")
		this.endRoundTimeout = setTimeout(() => this.endRound(), this.settings.timePerGame * 60 * 1000 + 4000);
		// 4000ms wegen dem Timer am Anfang
	}

	finishedGuessing(playerClass, { current_score, guessing_point, distance_between }) {
		playerClass.score_went_up_this_round_by = current_score - playerClass.score;
		playerClass.score = current_score;
		playerClass.guessing_point = guessing_point;
		playerClass.distance = distance_between;
		playerClass.has_guessed_this_round = true;

		this.emit("update-guess", {
			intentional_exit: false,
			socket_id: playerClass.socketId,
			distance: distance_between,
			nickname: playerClass.username
		});

		if (this.players.every(player => player.has_guessed_this_round)) {
			console.log("Everyone has guessed; ending round");
			this.endRound();
		}
	}

	endRound() {
		clearTimeout(this.endRoundTimeout);
		let transmitJson = {};

		for (let player of this.players) {
			transmitJson[player.socketId] = [
				player.score_went_up_this_round_by,
				player.guessing_point,
				player.username,
				player.distance, // unused?
				player.score,
				player.socketId,
				1,
				1, // color
			]
		}

		this.emit("finished-guessing", {
			"transmit_json": transmitJson
		})
	}
}

class Player {
	constructor(username, socketId) {
		this.username = username;
		this.socketId = socketId;
	}
}

const ClientSideEvents = Object.freeze({
	COLOR_CHANGE: "color-change", // Farbe von Spielern wechseln
	USER_JOIN: "user-join", // "room_list" object mit allen Spieler drin, player property mit dem Spielernamen
	CHANGE_NUM_OF_PLAYERS: "change-num-of-players", // room_list: {}
	LOBBY: "lobby", // room_list, host_id, host_name
	START_GAME_NOTIFY: "start-game-notify", // t_p_g, current_round, random_num, room_contents, player_info, iwie so
	FINISHED_GUESSING: "finished-guessing",
	CHECK_HOST_VERIFY: "check_host_verify",
	ROOM_DONT_EXIST: "room-dont-exist",
	PROFANITY: "profanity",
	ROOM_FULL: "room-full",
	UPDATE_GUESS: "update-guess",
	ROOM_DUPLICATE: "room-duplicate",
	ONE_PERSON: "one-person"
})

const rooms = [];

// geklaut
function score_grader(val) {
    ex = parseInt(Math.round(14.46 * (11.52 - Math.log(val))))
    return ex * 5
}

io.on('connection', socket => {
	console.log("Got connection");
	let currentRoom;
	console.log(socket.id);
	let currentPlayerClass;
	socket.on('disconnect', (reason) => {
		if (currentRoom) {
			console.log("removing from room");
			currentRoom.removePlayer(socket.id);
		}
	});
	socket.on('create_room', ({ time, username, room_id }) => {
		const room = new Room(room_id);
		room.settings.timePerGame = time;
		room.settings.tpgString = time;
		rooms.push(room);
		
		
		const player = new Player(username, socket.id);
		room.joinPlayer(player, socket);
		
		currentRoom = room;
		currentPlayerClass = player;
	});

	socket.on("join_room", ({ room_id, username, userid }) => {
		room_id = isNaN(parseInt(room_id)) ? room_id : parseInt(room_id);
		currentRoom = rooms.find(e => e.roomId === room_id);
		if (!currentRoom) {
			socket.emit(ClientSideEvents.ROOM_DONT_EXIST);
			return;
		}
		currentPlayerClass = new Player(username, socket.id);
		currentRoom.joinPlayer(currentPlayerClass, socket);
	});

	socket.on('begin_game', ({ time_per_guess, rounds, host_round }) => {
		// die machen das so lol
		switch (time_per_guess) {
			case "15 seconds":
				currentRoom.settings.timePerGame = 15 / 60;
				break;
			case "1 minute 30 seconds":
				currentRoom.settings.timePerGame = 90 / 60;
				break;
			default:
				currentRoom.settings.timePerGame = parseInt(time_per_guess);
				break;
		}
		currentRoom.settings.tpgString = time_per_guess;
		currentRoom.settings.rounds = rounds;

		currentRoom.startNewRound(host_round);
	});
	socket.on("current_score", (data) => {
		currentRoom.finishedGuessing(currentPlayerClass, data);
	})
	socket.on('end-round', () => {
		currentRoom.endRound();
	});
});
io.engine.on('headers', (headers, req) => {
	headers["Access-Control-Allow-Origin"] = "*";
});