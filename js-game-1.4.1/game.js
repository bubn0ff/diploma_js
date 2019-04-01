'use strict';

class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}
	
	plus(vector) {
		if(!(vector instanceof Vector)) {
			throw new Error('Можно прибавлять к вектору только вектор типа Vector');
		}

		return new Vector(this.x + vector.x, this.y + vector.y);
	}
	
	times(factor) {
		return new Vector(this.x * factor, this.y * factor);
	}
}

class Actor {
	constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
		this.pos = pos;
		this.size = size;
		this.speed = speed;

		if (!(pos instanceof Vector && size instanceof Vector && speed instanceof Vector)) {
			throw new Error(`Один из переданных свойств - ${pos}, ${size}, ${speed} - не является экземпляром класса Vector`);
		}
	}

	act() {}

	
	// A object boundaries - left, right, top, bottom.
	get left() {
		return this.pos.x;
	}

	get right() {
		return this.pos.x + this.size.x;
	}

	get top() {
		return this.pos.y;
	}

	get bottom() {
		return this.pos.y + this.size.y;
	}

	get type() {
		return 'actor';
	}

	isIntersect(actor) {
		if (!(actor instanceof Actor)) {
			throw new Error(`Объект ${actor} не передан или не является экземпляром класса Actor`);
		}

		// The object doesn't intersect with itself.
		if (this === actor) {
			return false;
		}

		// The object doesn't intersect with an object with adjacent borders.
		if ((this.pos.x === actor.pos.x + actor.size.x) || (actor.pos.x === this.pos.x + this.size.x) || 
		(this.pos.y === actor.pos.y + actor.size.y) || (actor.pos.y === this.pos.y + this.size.y)) {
			return false;
		}

		// The object doesn't intersect with an object located at the same point, but having a vector of negative size.
		if (actor.size.x < 0 || actor.size.y < 0) {
			return false;
		}

		/* The object intersects with an object that is fully or partially contained in it
		(obviously, that the object doesn't intersect with an object located very far away). */
		return (this.pos.x <= actor.pos.x && this.pos.x + this.size.x >= actor.pos.x && 
		 this.pos.y <= actor.pos.y && this.pos.y + this.size.y >= actor.pos.y) || 
		 (this.pos.x <= actor.pos.x + actor.size.x && this.pos.x + this.size.x >= actor.pos.x + actor.size.x && 
		 this.pos.y <= actor.pos.y + actor.size.y && this.pos.y + this.size.y >= actor.pos.y + actor.size.y);
	}
}

class Level {
	constructor(grid = [], actors = []) {
		this.grid = grid;
		this.actors = actors;
		this.height = grid.length;
		this.width = 0;
		this.status = null;
		this.finishDelay = 1;

		for(const actor of actors) {
			if (actor.type === 'player') {
				this.player = actor;
				break;
			}
		}

		/* The level width is equal to the number of grid cells. If in the rows have a different number of cells, 
		then the level width is equal to the number of cells in the longest row. */
		if (grid.length !== 0) {
			for(const arr of this.grid) {
				if (typeof arr != 'undefined' && this.width < arr.length) {
					this.width = arr.length;
				}
			}
		}
	}

	isFinished() {
		return this.status != null && this.finishDelay < 0;
	}

	actorAt(actor) {
		if(!(actor instanceof Actor)) {
			throw new Error(`Объект ${actor} не передан или не является экземпляром класса Actor`);
		}
		
		// Returns the object of the playing field, which intersects with the transferred object.
		return this.actors.find(el => el.isIntersect(actor));
	}

	obstacleAt(pos, size) {
		if(!(pos instanceof Vector && size instanceof Vector)) {
			throw new Error(`Один из аргументов - ${pos}, ${size} - не является экземпляром класса Vector`);
		}

		const xStart = Math.floor(pos.x);
		const yStart = Math.floor(pos.y);
		const xEnd = Math.ceil(pos.x + size.x);
		const yEnd = Math.ceil(pos.y + size.y);

		// if the left, right and top of the object are outside the level
		if (xStart < 0 || xEnd > this.width || yStart < 0) {
			return 'wall';
		}

		// if the bottom of the object are outside the level
		if (yEnd > this.height) {
			return 'lava';
		}

		// if the area intersects with the wall and the object has non-integer coordinates and size
		for(let y = yStart; y < yEnd; y++) {
			for(let x = xStart; x < xEnd; x++) {
				const obstacle = this.grid[y][x];
				if (typeof obstacle !== 'undefined') {
					return obstacle;
				}
			}
		}
	}

	removeActor(actor) {
		const indexActor = this.actors.indexOf(actor);
		if (indexActor != -1) {
			this.actors.splice(indexActor, 1);
		}
	}

	noMoreActors(type) {
		for(const actor of this.actors) {
			if (actor.type === type) {
				return false;
			}
		}		

		return true;
	}

	playerTouched(type, actor) {
		if (type === 'lava' || type === 'fireball') {
			this.status = 'lost';
		}
		
		if (type === 'coin' && actor.type === 'coin') {
			this.removeActor(actor);
			if (this.noMoreActors('coin')) {
				this.status = 'won';
			}
		}
	}
}

class LevelParser {
	constructor(dictionary) {
		this.dictionary = dictionary;
	}

	actorFromSymbol(symbol) {
		return (typeof symbol === 'undefined' || typeof this.dictionary === 'undefined') ? undefined : this.dictionary[symbol];
	}

	obstacleFromSymbol(symbol) {
		const symbols = {
			'x': 'wall',
			'!': 'lava'
		}

		return symbols[symbol];
	}

	createGrid(strings) {
		const array = [];
		let i = 0;
		
		for(const string of strings) {
			array[i] = [];
			
			for(let j = 0; j < string.length; j++) {
				const symbol = string.charAt(j);
				if (symbol) {
					array[i].push(this.obstacleFromSymbol(symbol));
				} else {
					array[i].push(undefined);
				}
			}
			
			i++;
		}
		
		return array;
	}

	createActors(strings) {
		const array = [];
		let i = 0;

		for(let y = 0; y < strings.length; y++) {
			const string = strings[y];

			for(let x = 0; x < string.length; x++) {
				const symbol = string.charAt(x);
				const actorConstructor = this.actorFromSymbol(symbol);
				
				if (typeof actorConstructor === 'function') {
					const actor = new actorConstructor();
				
					if (actor instanceof Actor) {
						array[i] = new actorConstructor();
						array[i].pos = new Vector(x, y);
						i++;
					}
				}
			}
		}

		return array;
	}

	// returns the playing field filled with obstacles and moving objects
	parse(strings) {
		return new Level(this.createGrid(strings), this.createActors(strings));
	}
}

class Fireball extends Actor {
	constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
		super(pos, new Vector(1, 1), speed);
	}

	get type() {
		return 'fireball';
	}

	getNextPosition(time = 1) {
		return this.pos.plus(this.speed.times(time));
	}
}