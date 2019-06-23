$scope = {}

var sounds = {
    MachineGun: "D:/DiceAndConquer/sounds/m249-1.wav",
    WeaponPick: "D:/DiceAndConquer/sounds/aug_forearm.wav",
    AWP: "D:/DiceAndConquer/sounds/awp1.wav",
    Hit1: "D:/DiceAndConquer/sounds/bullet_hit1.wav",
    Hit2: "D:/DiceAndConquer/sounds/ric_metal-1.wav",
    Hit3: "D:/DiceAndConquer/sounds/ric_metal-2.wav",
    Explode: "D:/DiceAndConquer/sounds/c4_explode1.wav",
    DryFire: "D:/DiceAndConquer/sounds/dryfire_rifle.wav",
    ScatterGun: "D:/DiceAndConquer/sounds/m3-1.wav",
    ShootGun: "D:/DiceAndConquer/sounds/xm1014-1.wav",
    Pistol: "D:/DiceAndConquer/sounds/p228-1.wav"
};

$scope.rowInvaders = 15;
$scope.colInvaders = 4;

var Game = function (canvasId, rowInvaders, colInvaders) {
    var canvas = document.getElementById(canvasId);
    var screen = canvas.getContext("2d");
    this.gameSize = {x: canvas.width, y: canvas.height};



    this.bodies = createInvaders(this, rowInvaders, colInvaders).concat([new Player(this, this.gameSize)]);

    var self = this;

    self.socketCn = new WebSocket("ws://127.0.0.1:2222/")
    loadSound(sounds, function (shootSounds) {
        self.shootSounds = shootSounds;
        var tick = function () {
            self.update();
            self.draw(screen, self.gameSize);
            requestAnimationFrame(tick);
        }

        tick();
    });
}

Game.prototype = {
    update: function () {
        var bodies = this.bodies;
        var gameSize = this.gameSize;
        var notCollidind = function (b1) {
            return bodies.filter(function (b2) {
                if (colliding(b1, b2)) {

                    return true;
                }
            }).length === 0;
        }

        this.bodies = filterInvisBodies(bodies, gameSize);
        this.bodies = this.bodies.filter(notCollidind);

        for (var i = 0; i < this.bodies.length; i++) {

            this.bodies[i].update();
        }
    },
    draw: function (screen, gameSize) {
        if (!gameSize)
            gameSize = this.gameSize;
        screen.clearRect(0, 0, gameSize.x, gameSize.y)
        for (var i = 0; i < this.bodies.length; i++) {
            drawRect(screen, this.bodies[i]);
        }
    },
    addBody: function (body) {
        this.bodies.push(body);
    },
    addBodies: function (bodies) {
        this.bodies = this.bodies.concat(bodies);
    },
    invadersBelow: function (invader) {
        return this.bodies.filter(function (b) {
            return b instanceof Invader &&
                b.center.y > invader.center.y &&
                Math.abs(b.center.x - invader.center.x) < invader.size.x;
        }).length > 0;
    },
    restart: function (rowInvaders, colInvaders) {

        this.bodies = createInvaders(this, rowInvaders, colInvaders).concat([new Player(this, this.gameSize)]);
    }
}

var drawRect = function (screen, body) {
    screen.fillRect(body.center.x - body.size.x / 2,
        body.center.y - body.size.y / 2,
        body.size.x, body.size.y);
}

var shootTypes = ["simple", "shotGun", "machineGun"];
$scope.shootType = shootTypes[0];
var Player = function (game, gameSize) {
    this.game = game;
    this.size = {x: 15, y: 15};
    this.settings = {health: 3}
    this.center = {x: gameSize.x / 2, y: gameSize.y - this.size.y};
    this.keyborder = new Keyborder();
}

Player.prototype = {
    update: function () {
        if (this.keyborder.isDown(this.keyborder.KEYS.LEFT)) {
            this.center.x -= 2;
        } else if (this.keyborder.isDown(this.keyborder.KEYS.RIGHT)) {
            this.center.x += 2;
        }

        if (this.keyborder.isDown(this.keyborder.KEYS.SPACE)) {
            switch ($scope.shootType) {
                case "simple":
                    if (this.game.bodies.filter(function (b) {
                        return b.isPlayerBullet;
                    }).length == 0) {
                        var bullet = new Bullet({x: this.center.x, y: this.center.y - this.size.x / 2},
                            {x: 0, y: -6}, true);
                        this.game.addBody(bullet);
                        this.game.shootSounds['Pistol'].load();
                        this.game.shootSounds['Pistol'].play();
                    }
                    break;
                case "shotGun": {
                    if (this.game.bodies.filter(function (b) {
                        return b.isPlayerBullet;
                    }).length == 0) {
                        var bullets = [new Bullet({x: this.center.x - 3, y: this.center.y - this.size.x / 2},
                            {x: -1, y: -6}, true),
                            new Bullet({x: this.center.x, y: this.center.y - this.size.x / 2},
                                {x: 0, y: -6}, true),
                            new Bullet({x: this.center.x + 3, y: this.center.y - this.size.x / 2},
                                {x: 1, y: -6}, true),];
                        this.game.addBodies(bullets);
                        this.game.shootSounds['ShootGun'].load();
                        this.game.shootSounds['ShootGun'].play();
                    }
                    break;
                }
                case "machineGun": {
                    var self = this;
                    var nearestBullet = Math.max.apply(Math, this.game.bodies.filter(function (b) {
                        return b.isPlayerBullet;
                    }).map(function (b) {
                        return b.center.y;
                    }));
                    if (Math.abs(this.center.y - nearestBullet) > 75) {
                        var bullet = new Bullet({x: this.center.x, y: this.center.y - this.size.x / 2},
                            {x: 0, y: -6}, true);
                        this.game.addBody(bullet);
                        self.game.shootSounds['MachineGun'].load();
                        self.game.shootSounds['MachineGun'].play();
                    }
                    break;
                }

            }
        }

    }
};

var Invader = function (game, center) {
    this.game = game;
    this.size = {x: 15, y: 15};
    this.center = center;
    this.patrolX = 0;
    this.settings = {health: 3};
    this.speedX = 0.3;
}

Invader.prototype = {
    update: function () {
        if (this.patrolX < 0 || this.patrolX > 40) {
            this.speedX = -this.speedX;
        }

        this.center.x += this.speedX;
        this.patrolX += this.speedX;

        if (Math.random() > 0.995 && !this.game.invadersBelow(this)) {
            var bullet = new Bullet({x: this.center.x, y: this.center.y + this.size.x * 2},
                {x: Math.random() * 2 - Math.random() * 2, y: 2});
            this.game.addBody(bullet);
        }
    }
};

var createInvaders = function (game, rowCount, colCount) {
    var invaders = [];
    for (var i = 0; i < rowCount * colCount; i++) {
        var x = 30 + (i % rowCount) * 30;
        var y = 30 + (i % colCount) * 30;
        invaders.push(new Invader(game, {x: x, y: y}));
    }

    return invaders;
}

var Bullet = function (center, velocity, isPlayer) {
    this.size = {x: 3, y: 3};
    this.center = center;
    this.velocity = velocity;
    this.isPlayerBullet = isPlayer;
    this.damage = 1;
}

Bullet.prototype = {
    update: function () {
        this.center.x += this.velocity.x;
        this.center.y += this.velocity.y;
    }
};

var Keyborder = function () {
    var keyState = {};
    this.KEYS = {LEFT: 65, RIGHT: 68, SPACE: 32, R: 82};
    window.onkeydown = function (e) {
        this.game.socketCn.send(e.keyCode+"")
        keyState[e.keyCode] = true;
        //switch shoot type
        if (e.keyCode == 82) {
            var currIndex = shootTypes.indexOf($scope.shootType);
            if (currIndex == shootTypes.length - 1)
                currIndex = 0;
            else
                currIndex++;

            $scope.shootType = shootTypes[currIndex];
        }
    }
    window.onkeyup = function (e) {
        keyState[e.keyCode] = false;
    }
    this.isDown = function (keyCode) {
        return keyState[keyCode] === true;
    }
}

var colliding = function (b1, b2) {
    return !(b1 === b2 ||
        b1.center.x + b1.size.x / 2 < b2.center.x - b2.size.x / 2 ||
        b1.center.y + b1.size.y / 2 < b2.center.y - b2.size.y / 2 ||
        b1.center.x - b1.size.x / 2 > b2.center.x + b2.size.x / 2 ||
        b1.center.y - b1.size.y / 2 > b2.center.y + b2.size.y / 2)
}

var filterInvisBodies = function (bodies, gameSize) {//bullets that gone far away :D
    return bodies.filter(function (b) {
        return (b.center.y < gameSize.y && b.center.y > 0);
    });
}

var loadSound = function (urls, callback) {
    var sounds = {};
    var s = 0
    for (var u in urls) {
        var loaded = function () {
            s++;
            sound.removeEventListener("canplaythrough", loaded);
            if (s == Object.keys(urls).length - 1)
                callback(sounds);

        }

        var sound = new Audio(urls[u]);
        sound.addEventListener("canplaythrough", loaded);
        sound.load();
        sounds[u] = sound;
    }

}
var game = new Game("space", 15, 4);
$scope.restart = function (rowInvaders, colInvaders) {
    if (game)
        game.restart(rowInvaders, colInvaders);

}
