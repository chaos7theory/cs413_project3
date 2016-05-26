'use strict';
// Copyright (c) 2016 Christopher Robert Philabaum
// Use self-closing anonymous function (using arrow-notation) to avoid flooding the 'namespace'
(() => {
    const TILE_SIZE = 16;
    const TILE_VIEW = 12;
    const MAP_HEIGHT = 5;
    const ZOOM = 4;
    var RENDER_WIDTH, RENDER_HEIGHT;

    var tu = new TileUtilities(PIXI);
    var game;

    // Only run when the document is fully loaded.
    document.addEventListener("DOMContentLoaded", (event) => {
        game = new Game(render);

        function render() {
            game.update();
            requestAnimationFrame(render);
        }
    }, false);

    class Game {
        constructor(render) {
            RENDER_HEIGHT = TILE_SIZE * ZOOM * MAP_HEIGHT;
            RENDER_WIDTH = TILE_SIZE * ZOOM * TILE_VIEW;

            // Append renderer to gameport
            this.gameport = document.getElementById("gameport");
            this.renderer = PIXI.autoDetectRenderer(RENDER_WIDTH, RENDER_HEIGHT, { backgroundColor: 0x000000 });
            gameport.appendChild(this.renderer.view);

            // Add screens
            this.screenMap = new Map();
            this.currentScreen = 'main';
            this.screenMap.set('title', new PIXI.Container());
            this.screenMap.set('tutorial', new PIXI.Container());
            this.screenMap.set('main', new PIXI.Container());
            this.screenMap.set('menu', new PIXI.Container());
            this.screenMap.set('lose', new PIXI.Container());
            this.screenMap.set('win', new PIXI.Container());
            this.screenMap.set('credits', new PIXI.Container());

            this.paused = false;
            // ... Menu code...
            let main =this.screenMap.get('main');
            main.addChild(this.screenMap.get('menu'));
            main.scale.x = ZOOM;
            main.scale.y = ZOOM;

            PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
            PIXI.loader
                .add('zone_json', 'assets/map/zone.json')
                .add('tiles', 'assets/img/tiles/tiles.png')
                .add('assets/assets.json')
                .load(() => {
                    this.world = tu.makeTiledWorld('zone_json', 'assets/img/tiles/tiles.png');
                    main.addChild(this.world);

                    this.player = new Player(this.world.getObject('player_spawn'),
                        100, 1);
                    this.world.addChild(this.player.sprite);

                    document.addEventListener('keydown', e => {
                        switch(e.keyCode) {
                            case(65):
                            case(68):
                                e.preventDefault();
                                if(!this.player.isAlive || this.player.moving) {
                                    return;
                                }
                                else {
                                    this.player.move_dir = MOVE_DIR.NONE;
                                }
                        }

                        switch(e.keyCode) {
                            // A
                            case(65):
                                this.player.move_dir = MOVE_DIR.LEFT;
                                break;
                            // D
                            case(68):
                                this.player.move_dir = MOVE_DIR.RIGHT;
                                break;
                            // Space
                            case(32):
                                e.preventDefault();
                                this.player.punch();
                                break;
                        }

                        this.player.move();
                    });

                    document.addEventListener('keyup', e => {
                        switch(e.keyCode) {
                            // A
                            case(65):
                            // D
                            case(68):
                                this.player.move_dir = MOVE_DIR.NONE;
                                break;
                            // Space
                            case(32):
                                e.preventDefault();
                        }
                    });

                    // Initialize render loop
                    render();
                });
        }

        update() {
            this.moveCamera();
            this.player.update()
            // Final step
            this.renderer.render(this.screenMap.get(this.currentScreen));
        }

        moveCamera() {
            let x = -this.player.sprite.x * ZOOM + RENDER_WIDTH / 2 - this.player.sprite.width / 2 * ZOOM;

            this.screenMap.get('main').x = -Math.max(0, Math.min(this.world.worldWidth * ZOOM - RENDER_WIDTH, -x));
        }
    }

    // Abstract class
    class Entity {
        constructor(spawn, max, speed, dir, file_pre) {
            this.moving = false;
            this.punching = false;
            this.speed = speed;
            this.MAX_HEALTH = max;
            this.health = this.MAX_HEALTH;
            this.move_dir = DIRECTION.NONE;
            this.direction = dir;

            this.sprite = new PIXI.Container();
            this.sprite.x = spawn.x;
            this.sprite.y = spawn.y;

            this.state = STATE.STILL;
            this.direction = DIRECTION.RIGHT;

            this.direction_containers = new Array();
            for(let dir in DIRECTION) {
                this.direction_containers.push(new PIXI.Container());
            }

            this.states = new Array();
            for(let dir of this.direction_containers) {
                let arr = new Array();
                for(let s in STATE) {
                    arr.push(new Array());
                }
                this.states.push(arr);
            }

            this.states[DIRECTION.RIGHT][STATE.STILL] = new PIXI.Sprite(PIXI.Texture.fromFrame(`${file_pre}1.png`));
            this.states[DIRECTION.LEFT][STATE.STILL] = new PIXI.Sprite(PIXI.Texture.fromFrame(`${file_pre}2.png`));
            let frames = new Array();
            for(let f = 3; f <= 6; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.RIGHT][STATE.WALK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.RIGHT][STATE.WALK].animationSpeed = 0.25;
            this.states[DIRECTION.RIGHT][STATE.WALK].play();

            frames = new Array();
            for(let f = 7; f <= 10; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.LEFT][STATE.WALK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.LEFT][STATE.WALK].animationSpeed = 0.25;
            this.states[DIRECTION.LEFT][STATE.WALK].play();

            frames = new Array();
            for(let f = 11; f <= 12; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.RIGHT][STATE.ATTACK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.RIGHT][STATE.ATTACK].animationSpeed = 0.1;
            this.states[DIRECTION.RIGHT][STATE.ATTACK].loop = false;

            frames = new Array();
            for(let f = 13; f <= 14; f++) {
                frames.push(PIXI.Texture.fromFrame(`${file_pre}${f}.png`));
            }
            this.states[DIRECTION.LEFT][STATE.ATTACK] = new PIXI.extras.MovieClip(frames);
            this.states[DIRECTION.LEFT][STATE.ATTACK].animationSpeed = 0.1;
            this.states[DIRECTION.RIGHT][STATE.ATTACK].loop = false;

            for(let dir in DIRECTION) {
                for(let state in STATE) {
                    this.direction_containers[DIRECTION[dir]].addChild(this.states[DIRECTION[dir]][STATE[state]]);
                }

                this.sprite.addChild(this.direction_containers[DIRECTION[dir]]);
            }
        }

        hurt(dmg) {
            this.health -= dmg;
            if(!this.isAlive) {
                this.die();
            }
        }

        attack(other) {};
        jump() {};
        walk() {};
        die() {};
        update() {
            if(this.punching && this.state !== STATE.ATTACK) {
                this.state = STATE.ATTACK;
            }
            else if(this.moving) {
                this.state = STATE.WALK;
            }
            else {
                this.state = STATE.STILL;
            }
            switch(this.move_dir) {
                case(MOVE_DIR.LEFT):
                    this.direction = DIRECTION.LEFT;
                    break;
                case(MOVE_DIR.RIGHT):
                    this.direction = DIRECTION.RIGHT;
                    break;
            }

            for(let dir in DIRECTION) {
                this.direction_containers[DIRECTION[dir]].visible = DIRECTION[dir] === this.direction;
                for(let state in STATE) {
                    this.states[DIRECTION[dir]][STATE[state]].visible = STATE[state] === this.state;
                }
            }

            if(this.state === STATE.ATTACK) {
                this.states[this.direction][this.state].play();
                this.punching = false;
            }
        };

        punch() {
            this.punching = true;
        }

        get isAlive() {
            return this.health > 0;
        }

        get danger() {
            return this.health / this.MAX_HEALTH <= 0.1;
        }

        getRelativeDir(other) {
            if(this.sprite.x < other.sprite.x) {
                return DIRECTION.RIGHT;
            }
            else {
                return DIRECTION.LEFT;
            }
        }

        move() {
            if(!this.move_dir || this.move_dir === MOVE_DIR.NONE) {
                this.moving = false;
                return;
            }

            this.moving = true;
            switch(this.move_dir) {
                case(MOVE_DIR.LEFT):
                    createjs.Tween.get(this.sprite).to({x: this.sprite.x - this.speed * TILE_SIZE},
                        500)
                        .call(() => {
                            this.move();
                        });
                    break;
                case(MOVE_DIR.RIGHT):
                    createjs.Tween.get(this.sprite).to({x: this.sprite.x + this.speed * TILE_SIZE},
                        500)
                        .call(() => {
                            this.move();
                        });
            }
        }
    }

    class Player extends Entity {
        constructor(spawn) {
            super(spawn, 100, 1.5, DIRECTION.RIGHT, 'player');
        }

        update() {
            super.update();
        }

        jump() {
            // #TODO Is this necessary?
        }

        walk() {
            // #TODO Walk cycle animation
        }

        die() {
            // #TODO Death animation
        }

        // Override
        attack(enemy) {
            enemy.hurt(10);
        }
    }

    class Enemy extends Entity {
        constructor(enemy_spawn, max) {
            super(enemy_spawn, max, 1 / 4, DIRECTION.LEFT, 'enemy');
        }

        // Override
        attack(player) {
            player.hurt(5);
        }

        update() {
            super.update();
        }

        follow(player) {
            this.direction = this.getRelativeDir(player);

            move();
        }
    }

    const STATE = {
        STILL: 0,
        WALK: 1,
        ATTACK: 2
    }

    const MOVE_DIR = {
        NONE: 0,
        LEFT: 1,
        RIGHT: 2
    }

    const DIRECTION = {
        LEFT: 0,
        RIGHT: 1
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
})();
