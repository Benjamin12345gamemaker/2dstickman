// Add at the beginning of the file, before any class definitions

// Multiplayer WebSocket connection
let socket;
let playerId;
let otherPlayers = {};
let remoteBullets = {};
let isMultiplayer = true;

// Connect to WebSocket server
function connectToServer() {
    // Use secure WebSocket if on HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === '' ? 'localhost' : window.location.hostname;
    const port = window.location.hostname === '' ? '3000' : window.location.port;
    const wsUrl = `${protocol}//${host}:${port}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('Connected to server');
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'init':
                // Initialize player with server-assigned ID
                playerId = data.id;
                
                // Initialize other players
                Object.keys(data.players).forEach(id => {
                    if (id !== playerId) {
                        otherPlayers[id] = data.players[id];
                    }
                });
                
                // Initialize remote bullets
                Object.keys(data.bullets).forEach(id => {
                    remoteBullets[id] = data.bullets[id];
                });
                
                console.log('Initialized with ID:', playerId);
                break;
                
            case 'newPlayer':
                // Add new player
                otherPlayers[data.player.id] = data.player;
                console.log('New player joined:', data.player.id);
                break;
                
            case 'updatePlayer':
                // Update player position
                if (otherPlayers[data.player.id]) {
                    otherPlayers[data.player.id] = data.player;
                }
                break;
                
            case 'removePlayer':
                // Remove player
                if (otherPlayers[data.id]) {
                    delete otherPlayers[data.id];
                    console.log('Player left:', data.id);
                }
                break;
                
            case 'newBullet':
                // Add new bullet
                remoteBullets[data.bullet.id] = data.bullet;
                break;
                
            case 'updateBullet':
                // Update bullet position
                if (remoteBullets[data.bullet.id]) {
                    remoteBullets[data.bullet.id] = data.bullet;
                }
                break;
                
            case 'removeBullet':
                // Remove bullet
                if (remoteBullets[data.id]) {
                    delete remoteBullets[data.id];
                }
                break;
                
            case 'playerHit':
                // Player was hit
                if (data.id === playerId) {
                    game.player.health = data.health;
                }
                break;
                
            case 'playerDied':
                // Player died
                if (data.id === playerId) {
                    game.player.isDead = true;
                    setTimeout(() => {
                        game.player.isDead = false;
                    }, 3000);
                }
                break;
                
            case 'playerRespawn':
                // Player respawned
                if (data.player.id === playerId) {
                    game.player.health = data.player.health;
                    game.player.x = data.player.x;
                    game.player.y = data.player.y;
                    game.player.isDead = false;
                } else if (otherPlayers[data.player.id]) {
                    otherPlayers[data.player.id] = data.player;
                }
                break;
        }
    };
    
    socket.onclose = () => {
        console.log('Disconnected from server');
        // Try to reconnect after 5 seconds
        setTimeout(connectToServer, 5000);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Initialize multiplayer if enabled
if (isMultiplayer) {
    connectToServer();
}

class AudioManager {
    constructor() {
        this.sounds = {
            shoot: new Audio('sounds/retro-laser-1-236669.mp3'),
            explosion: new Audio('sounds/explosion.mp3'),
            jump: new Audio('sounds/jump.mp3'),
            fly: new Audio('sounds/fly.mp3'),
            collect: new Audio('sounds/collect.mp3'),
            death: new Audio('sounds/death.mp3'),
            enemyDeath: new Audio('sounds/enemy_death.mp3'),
            dash: new Audio('sounds/dash.mp3'),
            nuke: new Audio('sounds/nuke.mp3'),
            wallPlace: new Audio('sounds/wall_place.mp3'),
            wallBreak: new Audio('sounds/wall_break.mp3'),
            hit: new Audio('sounds/hit.mp3'),
            reload: new Audio('sounds/reload.mp3'),
            weaponSwitch: new Audio('sounds/weapon_switch.mp3'),
            shotgun: new Audio('sounds/shotgun.mp3'),
            enemyShoot: new Audio('sounds/enemy_shoot.mp3'),
            empty: new Audio('sounds/empty.mp3')
        };

        // Create sound pools for frequently played sounds
        this.soundPools = {
            shoot: Array(5).fill().map(() => new Audio('sounds/retro-laser-1-236669.mp3')),
            explosion: Array(3).fill().map(() => new Audio('sounds/explosion.mp3')),
            enemyDeath: Array(3).fill().map(() => new Audio('sounds/enemy_death.mp3')),
            hit: Array(3).fill().map(() => new Audio('sounds/hit.mp3')),
            shotgun: Array(3).fill().map(() => new Audio('sounds/shotgun.mp3'))
        };

        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
        });

        // Set volume for sound pools
        Object.values(this.soundPools).forEach(pool => {
            pool.forEach(sound => {
                sound.volume = 0.3;
            });
        });

        // Set specific volumes
        this.sounds.explosion.volume = 0.4;
        this.sounds.nuke.volume = 0.5;
        this.sounds.shoot.volume = 0.15;
        this.soundPools.shoot.forEach(sound => sound.volume = 0.15);
        this.soundPools.shotgun.forEach(sound => sound.volume = 0.15);
        
        // Remove gun sound loop
        this.sounds.shoot.loop = false;
        this.lastFlySound = 0;
        this.currentPoolIndex = {};
    }

    play(soundName) {
        // Handle pooled sounds
        if (this.soundPools[soundName]) {
            if (!this.currentPoolIndex[soundName]) {
                this.currentPoolIndex[soundName] = 0;
            }
            
            const pool = this.soundPools[soundName];
            const sound = pool[this.currentPoolIndex[soundName]];
            
            if (sound.paused || sound.ended) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Audio play failed:", e));
            }
            
            this.currentPoolIndex[soundName] = (this.currentPoolIndex[soundName] + 1) % pool.length;
            return;
        }

        // Handle regular sounds
        const sound = this.sounds[soundName];
        if (sound) {
            // For fly sound, prevent too frequent playback
            if (soundName === 'fly') {
                const now = Date.now();
                if (now - this.lastFlySound < 100) return;
                this.lastFlySound = now;
            }
            
            if (sound.paused || sound.ended) {
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Add game state
        this.gameStarted = false;
        this.showCharacterSelect = false;
        
        // Add sprite toggle state
        this.isSpaceship = true;
        
        // Camera zoom (smaller number = more zoomed out)
        this.cameraZoom = 1.0;
        
        // Rest of constructor...
        
        // Create sprite toggle button
        this.createSpriteToggleButton();
        
        this.worldWidth = 6000;
        this.viewportX = 0;
        
        // Get initial ground height for player spawn
        const initialGroundHeight = this.canvas.height * 0.6;
        
        // Player properties
        this.player = {
            x: 100,
            y: initialGroundHeight - 40,
            width: 40,
            height: 24,
            health: 100,
            maxHealth: 100,
            speedX: 0,
            speedY: 0,
            maxSpeedX: 8,
            acceleration: 0.5,    // Reduced from 0.8 for smoother acceleration
            friction: 0.92,      // Adjusted for smoother deceleration
            gravity: 0.5,        // Reduced for smoother vertical movement
            jumpForce: -10,      // Adjusted for smoother jumps
            canJump: true,
            doubleJump: true,
            isSliding: false,
            rotation: 0,
            gunAngle: 0,
            forcedSlide: false,
            canFly: true,
            flyingSpeed: -5,     // Reduced for smoother flying
            descendSpeed: 2.5,   // Reduced for smoother descent
            isDead: false,
            capeAnimation: 0,
            flyingAcceleration: 0.3, // Reduced for smoother flying acceleration
            maxFlySpeed: 10,
            currentFlySpeed: 0,
            maxAmmo: 200,
            ammo: 200,
            isFullAuto: true,
            currentWeapon: 'rifle',
            isZoomed: false,
            isDashing: false,
            dashCooldown: 0,
            dashDuration: 15,
            dashSpeed: 90,
            lastWKeyState: false,
            // Add smoothing properties
            targetX: 100,
            targetY: initialGroundHeight - 40,
            smoothingFactor: 0.2 // How quickly to move toward target position
        };

        // Add weapon properties
        this.weapons = {
            rifle: {
                shootInterval: 150, // Normal speed
                bulletSpeed: 15,
                color: '#00FF00',
                ammoUsage: 1
            },
            shotgun: {
                shootInterval: 500, // Normal speed
                bulletSpeed: 12,
                spread: 0.5,
                pellets: 8,
                ammoUsage: 1
            },
            sniper: {
                shootInterval: 800, // Normal speed
                bulletSpeed: 30,
                color: '#0000FF',
                ammoUsage: 1
            },
            minigun: {
                shootInterval: 50, // Normal speed
                bulletSpeed: 20,
                color: '#FFFF00',
                ammoUsage: 1
            },
            launchGun: {
                shootInterval: 500,
                bulletSpeed: 40,
                spread: 0,
                launchForce: 70,
                color: '#4488ff'
            },
            landmine: {
                shootInterval: 1000,
                throwForce: 15,
                explosionRadius: 300, // 50 meters
                color: '#FF0000'
            }
        };

        // Add shop properties
        this.shop = {
            isOpen: false,
            items: {
                minigun: {
                    name: 'Minigun',
                    cost: 30,
                    purchased: false
                }
            },
            canOpen: false,
            timeRemaining: 0, // Time remaining to shop in frames (60fps)
            shopDuration: 900 // 15 seconds at 60fps
        };

        // Add coin system
        this.coins = 0;

        // Input handling
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            e: false,
            '9': false,
            q: false,
            '8': false
        };

        // Terrain destruction properties
        this.particles = [];
        this.deformationRadius = 300;
        this.maxParticles = 30;
        this.particleLifespan = 50;
        this.deformationStrength = 20;
        this.maxDeformationDepth = 200;
        this.tunnelWidth = 20;

        // Laser properties
        this.lasers = [];
        this.laserSpeed = 15;
        this.laserPower = 5;
        this.laserWidth = 6; // Added laser width property
        this.specialLaser = null; // Added for special laser beam
        this.specialLaserDuration = 0; // Duration counter for special laser

        // Terrain properties
        this.terrain = [];
        this.terrainDamage = new Map(); // Store terrain deformation
        this.generateTerrain();
        
        // Game state
        this.gameState = {
            distance: 0,
            winDistance: 15000,
            gameWon: false,
            killCount: 0,
            requiredKills: 100,
            currentWave: 1,
            maxEnemies: 2000
        };

        // Enemy properties
        this.enemies = [];
        this.deadEnemies = []; // Store dying enemies for animation
        this.enemyBullets = [];
        this.spawnEnemyTimer = 0;
        this.enemySpawnInterval = 5; // Changed from 30 to 5 for much faster spawning (6x faster)
        this.maxEnemies = 7;  // Changed from 20 to 7 for stick figure mode
        
        // Add blood particle properties
        this.bloodParticles = [];
        this.maxBloodParticles = 200;
        this.bloodParticleLifespan = 100;
        
        // Add grenade properties
        this.grenades = [];
        this.grenadeRadius = 25; // Reduced from 50
        this.grenadeWidth = 5;
        this.isChargingGrenade = false;
        this.chargedGrenadeMultiplier = 10; // Reduced from 50
        
        // Add cursor properties
        this.cursor = {
            x: 0,
            y: 0
        };
        
        // Add mouse button state
        this.mouseDown = false;
        this.lastShotTime = 0;
        this.shootInterval = this.weapons.rifle.shootInterval;
        
        // Increase grenade throw power
        this.grenadeThrowPower = 25; // Increased from 15
        
        // Add wooden wall properties
        this.walls = [];
        this.wallHealth = 5;
        this.wallWidth = 5;
        this.wallHeight = 60;
        this.wallDistance = 50;
        
        // Add nuke properties
        this.nukeReady = true;
        this.nukeCooldown = 0;
        this.nukeRadius = this.canvas.width;
        this.nukeGroundHeight = this.canvas.height * 0.9;
        
        // Bind event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Add audio manager
        this.audio = new AudioManager();
        
        // Start the game loop
        this.gameLoop();
        
        // Add special laser cooldown properties
        this.specialLaserCooldown = 0;
        this.specialLaserMaxCooldown = 600; // 10 seconds cooldown at 60fps
        
        // Add nuke animation properties
        this.nukeCountdown = 0;
        this.nukeFlashIntensity = 0;
        this.isNukeAnimationActive = false;
        this.nukeAnimationFrame = 0;
        this.lastCountdownNumber = 5;
        this.flashSpeed = 0.2; // Controls flash speed

        // Add spinning laser properties
        this.spinningLasers = null;
        this.spinningLaserAngle = 0;
        this.spinningLaserDuration = 0;
        this.spinningLaserCooldown = 0;
        this.spinningLaserCooldownTime = 600; // 10 seconds at 60fps
        this.spinningLaserUsed = false; // Add flag for one-time use

        // Add key handlers
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Remove wall properties and add healing properties
        this.isHealing = false;
        this.healingProgress = 0;
        this.healingDuration = 150; // 2.5 seconds at 60fps
        this.healAmount = 25;
        this.healingParticles = [];

        // Add wave system properties
        this.waveSystem = {
            currentWave: 1,
            enemiesPerWave: 20,
            enemiesSpawned: 0,
            breakTimer: 0,
            initialBreakDuration: 900, // 15 seconds at 60fps
            breakDuration: 900, // Will be updated each wave
            isBreak: false,
            baseEnemyAccuracy: 0.1, // Base enemy accuracy
            enemyAccuracyIncrement: 0.05, // 5% increase per wave
            waveKills: 0 // Add this to track kills per wave
        };

        // Set cursor properties
        this.canvas.style.cursor = 'none';

        // Add landmine array
        this.landmines = [];

        // Add mobile control properties
        this.mobileControls = {
            joystick: {
                active: false,
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
                maxDistance: 50, // Maximum joystick distance
                baseRadius: 40,  // Size of joystick base
                knobRadius: 20   // Size of joystick knob
            },
            shootButton: {
                x: 0,
                y: 0,
                radius: 40,
                pressed: false
            },
            jumpButton: {
                x: 0,
                y: 0,
                radius: 30,
                pressed: false
            },
            flyButton: {
                x: 0,
                y: 0,
                radius: 35,
                pressed: false
            },
            weaponButton: {
                x: 0,
                y: 0,
                radius: 30,
                pressed: false
            },
            tiltControls: {
                enabled: true,
                sensitivity: 5,
                tiltX: 0
            }
        };

        // Add touch event listeners
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Add device orientation event listener for tilt controls
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
        }
        
        // Detect if running on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Add after this.player initialization in the constructor
        this.isMultiplayer = isMultiplayer;
        
        // Add bullet bounce limiting properties
        this.bulletBounceCount = 0;
        this.bulletBounceResetTime = 0;
        this.maxBulletBouncesPerSecond = 5;

        // Add bullet lifetime property
        this.laserLifetime = 180; // 3 seconds at 60fps
    }

    handleDeviceOrientation(event) {
        if (!this.isMobile || !this.mobileControls.tiltControls.enabled) return;
        
        // Get gamma (left-right tilt)
        const gamma = event.gamma; // Range: -90 to 90
        
        // Normalize to a value between -1 and 1 with a dead zone
        if (Math.abs(gamma) < 5) {
            this.mobileControls.tiltControls.tiltX = 0; // Dead zone for stability
        } else {
            this.mobileControls.tiltControls.tiltX = gamma / 45; // Normalize to -1 to 1
            
            // Clamp to range -1 to 1
            if (this.mobileControls.tiltControls.tiltX > 1) this.mobileControls.tiltControls.tiltX = 1;
            if (this.mobileControls.tiltControls.tiltX < -1) this.mobileControls.tiltControls.tiltX = -1;
        }
    }

    handleTouchStart(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();

        // Handle death screen buttons on mobile
        if (this.player.isDead) {
            for (const touch of event.touches) {
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // Check retry button
                if (this.retryButton && 
                    x >= this.retryButton.x && 
                    x <= this.retryButton.x + this.retryButton.width &&
                    y >= this.retryButton.y && 
                    y <= this.retryButton.y + this.retryButton.height) {
                    // Retry with same character
                    const wasSpaceship = this.isSpaceship;
                    this.restartGame();
                    this.isSpaceship = wasSpaceship;
                    this.gameStarted = true;
                    this.audio.play('weaponSwitch');
                    return;
                }
                
                // Check quit button
                if (this.quitButton && 
                    x >= this.quitButton.x && 
                    x <= this.quitButton.x + this.quitButton.width &&
                    y >= this.quitButton.y && 
                    y <= this.quitButton.y + this.quitButton.height) {
                    // Return to start screen
                    this.restartGame();
                    this.gameStarted = false;
                    this.showCharacterSelect = false;
                    this.audio.play('weaponSwitch');
                    return;
                }
            }
            return;
        }

        for (const touch of event.touches) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // Left side of screen is for joystick (if not using tilt)
            if (x < this.canvas.width / 2 && !this.mobileControls.tiltControls.enabled) {
                this.mobileControls.joystick.active = true;
                this.mobileControls.joystick.startX = x;
                this.mobileControls.joystick.startY = y;
                this.mobileControls.joystick.currentX = x;
                this.mobileControls.joystick.currentY = y;
            } else {
                // Right side touches for buttons
                // Check shoot button
                const shootDist = Math.hypot(
                    x - this.mobileControls.shootButton.x,
                    y - this.mobileControls.shootButton.y
                );
                if (shootDist < this.mobileControls.shootButton.radius) {
                    this.mobileControls.shootButton.pressed = true;
                    this.mouseDown = true;
                }

                // Check jump button
                const jumpDist = Math.hypot(
                    x - this.mobileControls.jumpButton.x,
                    y - this.mobileControls.jumpButton.y
                );
                if (jumpDist < this.mobileControls.jumpButton.radius) {
                    this.mobileControls.jumpButton.pressed = true;
                    this.keys.w = true;
                }

                // Check fly button
                const flyDist = Math.hypot(
                    x - this.mobileControls.flyButton.x,
                    y - this.mobileControls.flyButton.y
                );
                if (flyDist < this.mobileControls.flyButton.radius) {
                    this.mobileControls.flyButton.pressed = true;
                    this.keys.w = true;
                }

                // Check weapon switch button
                const weaponDist = Math.hypot(
                    x - this.mobileControls.weaponButton.x,
                    y - this.mobileControls.weaponButton.y
                );
                if (weaponDist < this.mobileControls.weaponButton.radius) {
                    this.mobileControls.weaponButton.pressed = true;
                    this.cycleWeapons();
                }
            }
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();

        for (const touch of event.touches) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            if (x < this.canvas.width / 2 && this.mobileControls.joystick.active && !this.mobileControls.tiltControls.enabled) {
                // Update joystick position
                const dx = x - this.mobileControls.joystick.startX;
                const dy = y - this.mobileControls.joystick.startY;
                const distance = Math.hypot(dx, dy);

                if (distance > this.mobileControls.joystick.maxDistance) {
                    const angle = Math.atan2(dy, dx);
                    this.mobileControls.joystick.currentX = 
                        this.mobileControls.joystick.startX + 
                        Math.cos(angle) * this.mobileControls.joystick.maxDistance;
                    this.mobileControls.joystick.currentY = 
                        this.mobileControls.joystick.startY + 
                        Math.sin(angle) * this.mobileControls.joystick.maxDistance;
                } else {
                    this.mobileControls.joystick.currentX = x;
                    this.mobileControls.joystick.currentY = y;
                }

                // Update movement keys based on joystick position
                const normalizedX = dx / this.mobileControls.joystick.maxDistance;
                const normalizedY = dy / this.mobileControls.joystick.maxDistance;
                
                this.keys.a = normalizedX < -0.3;
                this.keys.d = normalizedX > 0.3;
                this.keys.s = normalizedY > 0.3;
            }
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        
        // Check if all touches are gone
        if (event.touches.length === 0) {
            // Reset joystick
            this.mobileControls.joystick.active = false;
            
            // Reset movement keys
            this.keys.a = false;
            this.keys.d = false;
            this.keys.s = false;
            
            // Reset buttons
            this.mobileControls.shootButton.pressed = false;
            this.mobileControls.jumpButton.pressed = false;
            this.mobileControls.flyButton.pressed = false;
            this.mobileControls.weaponButton.pressed = false;
            this.mouseDown = false;
            this.keys.w = false;
        }
    }

    cycleWeapons() {
        const weapons = ['rifle', 'shotgun', 'sniper', 'landmine'];
        const currentIndex = weapons.indexOf(this.player.currentWeapon);
        const nextIndex = (currentIndex + 1) % weapons.length;
        this.player.currentWeapon = weapons[nextIndex];
        this.shootInterval = this.weapons[this.player.currentWeapon].shootInterval;
        this.audio.play('weaponSwitch');
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    generateTerrain() {
        this.terrain = [];
        const segments = 400;
        const segmentWidth = this.worldWidth / segments;
        let currentHeight = this.canvas.height * 0.8; // Changed from 0.6 to 0.8 for lower floor
        let patternPhase = 0; // 0: upslope, 1: flat, 2: downslope
        let flatSegments = 0;
        const slopeAngle = 20 * (Math.PI / 180);
        
        for (let i = 0; i <= segments; i++) {
            const x = i * segmentWidth;
            
            // More frequent pattern changes
            if (Math.random() < 0.1) {
                patternPhase = Math.random() < 0.7 ? 0 : 2; // 70% chance for upslope
            }
            
            switch(patternPhase) {
                case 0: // Upslope
                    currentHeight -= Math.tan(slopeAngle) * segmentWidth;
                    if (flatSegments > 5) {
                        patternPhase = Math.random() < 0.3 ? 1 : 2;
                        flatSegments = 0;
                    }
                    break;
                    
                case 1: // Flat section
                    flatSegments++;
                    if (flatSegments >= 5) {
                        patternPhase = Math.random() < 0.7 ? 0 : 2;
                        flatSegments = 0;
                    }
                    break;
                    
                case 2: // Rounded downslope
                    const progress = (flatSegments % 10) / 10;
                    const curve = Math.sin(progress * Math.PI);
                    currentHeight += Math.tan(slopeAngle * 0.8) * segmentWidth * curve;
                    flatSegments++;
                    if (flatSegments >= 10) {
                        patternPhase = 0;
                        flatSegments = 0;
                    }
                    break;
            }
            
            // Keep height within bounds
            currentHeight = Math.max(this.canvas.height * 0.6,  // Changed from 0.3 to 0.6
                          Math.min(this.canvas.height * 0.9, currentHeight));  // Changed from 0.8 to 0.9
            
            this.terrain.push({
                x: x,
                y: currentHeight,
                originalY: currentHeight // Store original height for deformation
            });
        }
    }

    handleKeyDown(event) {
        switch(event.key.toLowerCase()) {
            case 'w': 
                this.keys.w = true; 
                if (this.player.canJump) {
                    this.audio.play('jump');
                }
                break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
            case 'e': 
                this.isChargingGrenade = true;
                this.keys.e = true;
                break;
            case 'q':
                break;
            case '9':
                break;
            case 'shift': 
                if (event.location === 1) { // Left shift (location 1)
                    if (!this.player.isDashing && this.player.dashCooldown <= 0) {
                        this.audio.play('dash');
                        this.player.isDashing = true;
                        this.player.dashCooldown = 60;
                        
                        // Determine dash direction based on movement keys
                        let dashAngle = 0;
                        let hasMoveDirection = false;
                        
                        // Calculate direction based on movement keys
                        if (this.keys.d && !this.keys.a) {
                            dashAngle = 0; // Right
                            hasMoveDirection = true;
                        } else if (this.keys.a && !this.keys.d) {
                            dashAngle = Math.PI; // Left
                            hasMoveDirection = true;
                        }
                        
                        if (this.keys.w && !this.keys.s) {
                            if (hasMoveDirection) {
                                // Diagonal up
                                dashAngle = dashAngle === 0 ? -Math.PI/4 : -3*Math.PI/4;
                } else {
                                dashAngle = -Math.PI/2; // Up
                                hasMoveDirection = true;
                            }
                        } else if (this.keys.s && !this.keys.w) {
                            if (hasMoveDirection) {
                                // Diagonal down
                                dashAngle = dashAngle === 0 ? Math.PI/4 : 3*Math.PI/4;
                            } else {
                                dashAngle = Math.PI/2; // Down
                                hasMoveDirection = true;
                            }
                        }
                        
                        // If no movement keys are pressed, use the current velocity direction
                        if (!hasMoveDirection) {
                            if (Math.abs(this.player.speedX) > 0.1 || Math.abs(this.player.speedY) > 0.1) {
                                dashAngle = Math.atan2(this.player.speedY, this.player.speedX);
                            } else {
                                // If no movement and no velocity, use the crosshair direction as fallback
                                dashAngle = this.player.gunAngle;
                            }
                        }
                        
                        // Apply dash velocity
                        const dashSpeed = 15;
                        this.player.speedX = Math.cos(dashAngle) * dashSpeed;
                        this.player.speedY = Math.sin(dashAngle) * dashSpeed;
                    }
                } else if (event.location === 2) { // Right shift (location 2)
                    // Toggle between full auto and semi auto
                    this.player.isFullAuto = !this.player.isFullAuto;
                    
                    // Update UI feedback
                    const message = this.player.isFullAuto ? 'Full Auto Enabled' : 'Semi Auto Enabled';
                    console.log(message); // Debug message
                    
                    // Play feedback sound
                    this.audio.play('weaponSwitch');
                }
                break;
            case '1':
            case '2':
            case '3':
            case '6':
                this.audio.play('weaponSwitch');
                if (event.key === '1') {
                    this.player.currentWeapon = 'rifle';
                    this.shootInterval = this.weapons.rifle.shootInterval;
                    this.player.isZoomed = false;
                } else if (event.key === '2') {
                    this.player.currentWeapon = 'shotgun';
                    this.shootInterval = this.weapons.shotgun.shootInterval;
                } else if (event.key === '3') {
                    this.player.currentWeapon = 'sniper';
                    this.shootInterval = this.weapons.sniper.shootInterval;
                } else if (event.key === '6' && !this.isSpaceship) {
                    this.player.currentWeapon = 'launchGun';
                    this.shootInterval = this.weapons.launchGun.shootInterval;
                }
                break;
            case '4':
                if (!this.isHealing && this.player.health < this.player.maxHealth) {
                    this.startHealing();
                }
                break;
            case '5':
                if (this.nukeReady) {
                    this.dropNuke();
                    this.audio.play('nuke');
                }
                break;
            case ' ': // Space bar
                if (!this.specialLaser && this.specialLaserDuration <= 0 && this.specialLaserCooldown <= 0) {
                    this.createSpecialLaser();
                }
                break;
            case '7':
                if (this.spinningLaserCooldown <= 0 && !this.spinningLasers) {
                    this.createSpinningLasers();
                }
                break;
            case 'b': // Shop toggle
                if (this.shop.canOpen && this.shop.timeRemaining > 0) {
                    this.shop.isOpen = !this.shop.isOpen;
                }
                break;
            case '8':
                this.audio.play('weaponSwitch');
                this.player.currentWeapon = 'landmine';
                this.shootInterval = this.weapons.landmine.shootInterval;
                break;
        }
    }

    handleKeyUp(event) {
        switch(event.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
            case 'e':
                this.isChargingGrenade = false;
                this.keys.e = false;
                break;
            case 'q': this.keys.q = false; break;
        }
    }

    handleMouseMove(event) {
        if (!this.isMobile) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Update cursor position
        this.cursor.x = mouseX;
        this.cursor.y = mouseY;
        
        // Calculate angle between player and mouse
        const dx = mouseX - (this.player.x - this.viewportX + 10);
        const dy = mouseY - (this.player.y + 20);
        this.player.gunAngle = Math.atan2(dy, dx);
        }
    }

    handleMouseDown(event) {
        if (!this.gameStarted) {
            const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = event.clientY - this.canvas.getBoundingClientRect().top;

            if (!this.showCharacterSelect) {
                // Check if clicked on start button
                if (this.startButton && 
                    mouseX >= this.startButton.x && 
                    mouseX <= this.startButton.x + this.startButton.width &&
                    mouseY >= this.startButton.y && 
                    mouseY <= this.startButton.y + this.startButton.height) {
                    this.showCharacterSelect = true;
                    this.audio.play('weaponSwitch');
                }
                return;
            }

            // Handle character selection
            if (this.characterButtons) {
                // Check spaceship button
                if (mouseX >= this.characterButtons.spaceship.x && 
                    mouseX <= this.characterButtons.spaceship.x + this.characterButtons.spaceship.width &&
                    mouseY >= this.characterButtons.spaceship.y && 
                    mouseY <= this.characterButtons.spaceship.y + this.characterButtons.spaceship.height) {
                    this.isSpaceship = true;
                    this.gameStarted = true;
                    this.audio.play('weaponSwitch');
                }
                // Check stick figure button
                else if (mouseX >= this.characterButtons.stickFigure.x && 
                         mouseX <= this.characterButtons.stickFigure.x + this.characterButtons.stickFigure.width &&
                         mouseY >= this.characterButtons.stickFigure.y && 
                         mouseY <= this.characterButtons.stickFigure.y + this.characterButtons.stickFigure.height) {
                    this.isSpaceship = false;
                    this.gameStarted = true;
                    this.audio.play('weaponSwitch');
                }
            }
            return;
        }

        // Check for retry or quit button click on death screen
        if (this.player.isDead) {
            const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = event.clientY - this.canvas.getBoundingClientRect().top;

            // Check retry button
            if (this.retryButton && 
                mouseX >= this.retryButton.x && 
                mouseX <= this.retryButton.x + this.retryButton.width &&
                mouseY >= this.retryButton.y && 
                mouseY <= this.retryButton.y + this.retryButton.height) {
                // Retry with same character
                const wasSpaceship = this.isSpaceship;
                this.restartGame();
                this.isSpaceship = wasSpaceship;
                this.gameStarted = true;
                this.audio.play('weaponSwitch');
                return;
            }
            
            // Check quit button
            if (this.quitButton && 
                mouseX >= this.quitButton.x && 
                mouseX <= this.quitButton.x + this.quitButton.width &&
                mouseY >= this.quitButton.y && 
                mouseY <= this.quitButton.y + this.quitButton.height) {
                // Return to start screen
                this.restartGame();
                this.gameStarted = false;
                this.showCharacterSelect = false;
                this.audio.play('weaponSwitch');
                return;
            }
            return;
        }

        // Original mouse down logic
        if (event.button === 0) {
            if (this.isChargingGrenade) {
                this.throwChargedGrenade();
            } else {
                this.mouseDown = true;
                if (!this.player.isFullAuto) {
                    this.shoot();
                    this.mouseDown = false;
                }
            }
        } else if (event.button === 2 && this.player.currentWeapon === 'sniper') {
            this.player.isZoomed = !this.player.isZoomed;
        }
    }

    handleMouseUp(event) {
        if (event.button === 0) { // Left click
            this.mouseDown = false;
        }
    }

    shoot() {
        const currentTime = Date.now();
        
        if (currentTime - this.lastShotTime > this.shootInterval) {
        const weapon = this.weapons[this.player.currentWeapon];
        
            // Check if we have enough ammo
            if (this.player.ammo < weapon.ammoUsage) {
                this.audio.play('empty');
                return;
            }
            
            // Reduce ammo
            this.player.ammo -= weapon.ammoUsage;
            
            // Calculate angle to cursor
            const angle = this.player.gunAngle;
            
            if (this.player.currentWeapon === 'grenade') {
                this.throwChargedGrenade();
            }
            else if (this.player.currentWeapon === 'launchGun') {
                // Launch gun: propels player in opposite direction
                this.audio.play('shoot');
                
                // Create bullet
                this.lasers.push({
                        x: this.player.x,
                        y: this.player.y,
                    dx: Math.cos(angle) * weapon.bulletSpeed,
                    dy: Math.sin(angle) * weapon.bulletSpeed,
                    color: weapon.color || '#4488ff',
                    bounceCount: 0,
                    lifetime: this.laserLifetime
                });
                
                // Remove launch force (recoil)
                // Apply launch force to player in opposite direction
                // this.player.speedX -= Math.cos(angle) * weapon.launchForce;
                // this.player.speedY -= Math.sin(angle) * weapon.launchForce;
            }
            else if (this.player.currentWeapon === 'shotgun') {
                // Shotgun: multiple pellets with perfect accuracy
                this.audio.play('shotgun');
                
                // Create multiple pellets all going to the same spot
                for (let i = 0; i < weapon.pellets; i++) {
                        this.lasers.push({
                        x: this.player.x,
                        y: this.player.y,
                        dx: Math.cos(angle) * weapon.bulletSpeed,
                        dy: Math.sin(angle) * weapon.bulletSpeed,
                        color: '#FFFF00',
                        bounceCount: 0,
                        lifetime: this.laserLifetime
                    });
                }
            }
            else {
                // Regular weapons (rifle, sniper, minigun)
                this.audio.play('shoot');
                this.lasers.push({
                    x: this.player.x,
                    y: this.player.y,
                    dx: Math.cos(angle) * weapon.bulletSpeed,
                    dy: Math.sin(angle) * weapon.bulletSpeed,
                    color: weapon.color || '#00FF00',
                    bounceCount: 0,
                    lifetime: this.laserLifetime
                });
            }
            
            this.lastShotTime = currentTime;
        }

        // Add at the end of the shoot method, after creating a laser
        if (this.isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
            // Send bullet data to server
            socket.send(JSON.stringify({
                type: 'shoot',
                x: this.player.x,
                y: this.player.y,
                dx: this.lasers[this.lasers.length - 1].dx,
                dy: this.lasers[this.lasers.length - 1].dy,
                color: this.lasers[this.lasers.length - 1].color
            }));
        }
    }

    getGroundHeight(x) {
        // Find the terrain point closest to x
        const worldX = x;
        
        // Find the closest terrain points
        let leftPoint = null;
        let rightPoint = null;
        
        for (const point of this.terrain) {
            if (point.x <= worldX && (leftPoint === null || point.x > leftPoint.x)) {
                leftPoint = point;
            }
            if (point.x >= worldX && (rightPoint === null || point.x < rightPoint.x)) {
                rightPoint = point;
            }
        }
        
        // If we don't have both points, return a default height
        if (!leftPoint || !rightPoint) {
            return this.canvas.height * 0.8; // Default ground height
        }
        
        // If the points are the same, return that height
        if (leftPoint === rightPoint) {
            return leftPoint.y;
        }
        
        // Interpolate between the two points
        const ratio = (worldX - leftPoint.x) / (rightPoint.x - leftPoint.x);
        const leftHeight = this.terrainDamage.get(Math.floor(leftPoint.x)) || leftPoint.originalY;
        const rightHeight = this.terrainDamage.get(Math.floor(rightPoint.x)) || rightPoint.originalY;
        
        return leftHeight + ratio * (rightHeight - leftHeight);
    }
    
    getTerrainAngle(x) {
        // Find the terrain points to the left and right of x
        const worldX = x;
        const sampleDistance = 5; // Distance to sample for calculating angle
        
        // Get heights at left and right sample points
        const leftHeight = this.getGroundHeight(worldX - sampleDistance);
        const rightHeight = this.getGroundHeight(worldX + sampleDistance);
        
        // Calculate angle based on the slope
        return Math.atan2(rightHeight - leftHeight, sampleDistance * 2);
    }

    createExplosion(x, y) {
        const colors = ['#FF4400', '#FF6600', '#FF8800', '#FFAA00'];
        
        for (let i = 0; i < this.maxParticles; i++) {
            const angle = (Math.PI * 2 * i) / this.maxParticles;
            const speed = 3 + Math.random() * 4;
            const size = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 2,
                life: this.particleLifespan,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: size
            });
        }
    }

    deformTerrain(x, y, radius) {
        // Remove viewport offset since x is already in world coordinates
        const worldX = x;
        
        // Create impact dimensions for a deeper hole
        const impactWidth = 8; // Wider impact
        const impactDepth = 15; // Much deeper impact (increased from 5)
        
        // Find affected terrain points
        for (let i = 0; i < this.terrain.length; i++) {
            const point = this.terrain[i];
            const dx = point.x - worldX;
            
            if (Math.abs(dx) < impactWidth/2) {
                // Get original height from the point
                const surfaceHeight = point.originalY;
                
                // Get current height (may have been modified by previous shots)
                const currentHeight = this.terrainDamage.get(Math.floor(point.x)) || surfaceHeight;
                
                // Calculate distance from center for smooth impact edges
                const distanceFromCenter = Math.abs(dx) / (impactWidth/2);
                
                // Create a deeper crater shape
                // The closer to center, the deeper
                const deformationAmount = impactDepth * (1 - distanceFromCenter * distanceFromCenter);
                
                // Calculate new height with deeper impact
                // For terrain, HIGHER y value means LOWER position on screen
                // So we ADD to y to make a dent downward
                let newHeight = currentHeight;
                
                // Only apply deformation if it would make a dent (not a spike)
                if (deformationAmount > 0) {
                    newHeight = currentHeight + deformationAmount;
                }
                
                // Ensure we never go below original height + impactDepth
                // This prevents any possibility of deeper holes than intended
                newHeight = Math.min(newHeight, surfaceHeight + impactDepth);
                
                // Store deformation
                const key = Math.floor(point.x);
                this.terrainDamage.set(key, newHeight);
                point.y = newHeight;
            }
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.dy += 0.2; // Gravity
            particle.life--;
            return particle.life > 0;
        });
    }

    update() {
        // Check win condition
        this.gameState.distance = Math.floor(this.player.x / 10);
        if (this.gameState.distance >= this.gameState.winDistance) {
            this.gameState.gameWon = true;
        }

        // Update nuke animation
        this.updateNukeAnimation();

        // Check if player hits bottom of screen
        if (this.player.y > this.canvas.height) {
            this.player.isDead = true;
        }

        // Check if player health is zero or below
        if (this.player.health <= 0) {
            this.player.isDead = true;
        }

        if (this.player.isDead) {
            return;
        }

        // Update enemies and their bullets
        this.updateEnemies();
        this.updateEnemyBullets();

        // Spawn new enemies
        this.spawnEnemyTimer++;
        if (!this.waveSystem.isBreak && this.spawnEnemyTimer >= this.enemySpawnInterval) {
            this.spawnEnemyTimer = 0;
            if (this.enemies.length < this.maxEnemies) {
                this.spawnEnemy();
            }
        }

        // Handle rapid fire
        if (this.mouseDown && this.player.isFullAuto) {
            this.shoot();
        }

        // Update lasers and check for terrain collision
        this.lasers = this.lasers.filter(laser => {
            // Add lifetime property if it doesn't exist
            if (laser.lifetime === undefined) {
                laser.lifetime = this.laserLifetime;
            }
            
            // Decrement lifetime and remove if expired
            laser.lifetime--;
            if (laser.lifetime <= 0) {
                return false;
            }
            
            // Check wall collisions
            for (let i = this.walls.length - 1; i >= 0; i--) {
                const wall = this.walls[i];
                const dx = laser.dx;
                const dy = laser.dy;
                const laserEndX = laser.x + dx;
                const laserEndY = laser.y + dy;
                
                // Transform laser coordinates relative to wall rotation
                const relativeX = laser.x - wall.x;
                const relativeY = laser.y - wall.y;
                const rotatedX = relativeX * Math.cos(-wall.rotation) - relativeY * Math.sin(-wall.rotation);
                const rotatedY = relativeX * Math.sin(-wall.rotation) + relativeY * Math.cos(-wall.rotation);
                
                const relativeEndX = laserEndX - wall.x;
                const relativeEndY = laserEndY - wall.y;
                const rotatedEndX = relativeEndX * Math.cos(-wall.rotation) - relativeEndY * Math.sin(-wall.rotation);
                const rotatedEndY = relativeEndX * Math.sin(-wall.rotation) + relativeEndY * Math.cos(-wall.rotation);
                
                // Check if laser intersects with wall
                if (this.lineIntersectsBox(
                    rotatedX, rotatedY,
                    rotatedEndX, rotatedEndY,
                    0, 0,
                    wall.width, wall.height
                )) {
                    wall.health--;
                    if (wall.health <= 0) {
                        this.walls.splice(i, 1);
                        this.audio.play('wallBreak');
                    }
                    return false;
                }
            }

            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const dx = laser.dx;
                const dy = laser.dy;
                const laserEndX = laser.x + dx;
                const laserEndY = laser.y + dy;
                
                if (this.lineIntersectsBox(
                    laser.x, laser.y,
                    laserEndX, laserEndY,
                    enemy.x, enemy.y,
                    enemy.width, enemy.height
                )) {
                    enemy.isDying = true;
                    enemy.deathTimer = 0;
                    enemy.speedY = -5;
                    enemy.color = '#000000';
                    enemy.canShoot = false;
                    this.player.ammo += enemy.ammo;
                    this.deadEnemies.push(enemy);
                    this.enemies.splice(i, 1);
                    this.createBloodEffect(enemy.x, enemy.y);
                    this.audio.play('enemyDeath');
                    this.gameState.killCount++;
                    this.waveSystem.waveKills++; // Add this line
                    this.coins++; // Add coins for kills
                    return false;
                }
            }

            // Move the laser
            laser.x += laser.dx;
            laser.y += laser.dy;
            
            // Check terrain collision
            const terrainY = this.getGroundHeight(laser.x);
            if (laser.y >= terrainY) {
                // Always create explosion and deform terrain
                this.createExplosion(laser.x, laser.y);
                this.deformTerrain(laser.x, laser.y, this.deformationRadius);
                return false;
            }
            
            // Keep laser if it's within a reasonable range of the player
            return Math.abs(laser.x - this.player.x) < 20000; // Increased range to 20000
        });

        // Update particles
        this.updateParticles();

        // Update grenades
        this.grenades = this.grenades.filter(grenade => {
            // Apply gravity and movement
            grenade.speedY += 0.5;
            grenade.x += grenade.speedX;
            grenade.y += grenade.speedY;
            
            // Check for terrain collision
            const terrainY = this.getGroundHeight(grenade.x);
            if (grenade.y >= terrainY) {
                this.createGrenadeExplosion(grenade.x, grenade.y, grenade.isCharged);
                return false;
            }
            
            // Check for wall collisions
            for (let i = this.walls.length - 1; i >= 0; i--) {
                const wall = this.walls[i];
                if (Math.abs(grenade.x - wall.x) < wall.width/2 &&
                    grenade.y > wall.y &&
                    grenade.y < wall.y + wall.height) {
                    this.createGrenadeExplosion(grenade.x, grenade.y, grenade.isCharged);
                    return false;
                }
            }
            
            return true;
        });

        // Update special laser cooldown
        if (this.specialLaserCooldown > 0) {
            this.specialLaserCooldown--;
        }

        // Update special laser
        if (this.specialLaser) {
            this.specialLaserDuration--;
            if (this.specialLaserDuration <= 0) {
                this.specialLaser = null;
                this.specialLaserCooldown = this.specialLaserMaxCooldown; // Start cooldown when laser expires
            } else {
                // Update laser position and angle to follow player and mouse
                this.specialLaser.x = this.player.x;
                this.specialLaser.y = this.player.y;
                this.specialLaser.angle = this.player.gunAngle;

                // Check for enemy collisions with special laser
                this.enemies = this.enemies.filter(enemy => {
                    const dx = enemy.x - this.specialLaser.x;
                    const dy = enemy.y - this.specialLaser.y;
                    const angle = Math.atan2(dy, dx);
                    const angleDiff = Math.abs(angle - this.specialLaser.angle);
                    if (angleDiff < 0.1 && Math.sqrt(dx * dx + dy * dy) < 2000) {
                        this.createBloodEffect(enemy.x, enemy.y);
                        this.audio.play('enemyDeath');
                        this.gameState.killCount++;
                        this.waveSystem.waveKills++; // Add this line
                        this.coins++; // Add coins for kills
                        return false;
                    }
                    return true;
                });
            }
        }

        // Update movement based on player mode
        if (this.isSpaceship) {
            // Spaceship movement - can fly freely
            if (this.keys.d) {
                this.player.speedX += this.player.acceleration;
            }
            if (this.keys.a) {
                this.player.speedX -= this.player.acceleration;
            }
            if (this.keys.w) {
                this.player.speedY -= this.player.acceleration;
            }
            if (this.keys.s) {
                this.player.speedY += this.player.acceleration;
            }
            
            // Apply friction to both X and Y movement
            if (this.player.currentWeapon === 'launchGun' && !this.player.canJump) {
                // Much lower friction when using launch gun in the air
                this.player.speedX *= 0.99;
                this.player.speedY *= 0.99;
            } else {
            this.player.speedX *= this.player.friction;
            this.player.speedY *= this.player.friction;
            }

            // Cap speed at 45 for both directions
            const currentSpeed = Math.sqrt(this.player.speedX * this.player.speedX + this.player.speedY * this.player.speedY);
            if (currentSpeed > 122) {
                const angle = Math.atan2(this.player.speedY, this.player.speedX);
                this.player.speedX = Math.cos(angle) * 122;
                this.player.speedY = Math.sin(angle) * 122;
            }
            
            // Apply smoothing to position updates
            this.player.x += this.player.speedX;
            this.player.y += this.player.speedY;
        } else {
            // Stick figure movement - platformer style
            // Horizontal movement
            if (this.keys.d) {
                // Gradually increase speed for smoother acceleration
                this.player.speedX += this.player.acceleration;
                if (this.player.speedX > this.player.maxSpeedX) {
                    this.player.speedX = this.player.maxSpeedX;
                }
            }
            else if (this.keys.a) {
                // Gradually increase speed for smoother acceleration
                this.player.speedX -= this.player.acceleration;
                if (this.player.speedX < -this.player.maxSpeedX) {
                    this.player.speedX = -this.player.maxSpeedX;
                }
            }
            else {
                // Apply friction when no keys are pressed
                this.player.speedX *= this.player.friction;
                
                // Stop completely if speed is very low to prevent tiny movements
                if (Math.abs(this.player.speedX) < 0.1) {
                    this.player.speedX = 0;
                }
            }
            
            // Apply gravity
            this.player.speedY += this.player.gravity;
            
            // Apply flying if W key is pressed and can fly
            if (this.keys.w && this.player.canFly) {
                // Gradually increase flying speed for smoother acceleration
                this.player.currentFlySpeed += this.player.flyingAcceleration;
                if (this.player.currentFlySpeed > this.player.maxFlySpeed) {
                    this.player.currentFlySpeed = this.player.maxFlySpeed;
                }
                
                this.player.speedY = -this.player.currentFlySpeed;
                
                // Play flying sound at intervals
                const currentTime = Date.now();
                if (currentTime - this.lastFlySound > 500) {
                    this.audio.play('fly');
                    this.lastFlySound = currentTime;
                }
                
                // Create jetpack flame particles
                for (let i = 0; i < 3; i++) {
                    const spread = (Math.random() - 0.5) * 0.5;
                    const speed = 3 + Math.random() * 4;
                    this.particles.push({
                        x: this.player.x,
                        y: this.player.y + this.player.height/2,
                        dx: Math.cos(Math.PI/2 + spread) * speed,
                        dy: Math.sin(Math.PI/2 + spread) * speed,
                        life: 15 + Math.random() * 10,
                        color: '#FF4400',
                        size: 2 + Math.random() * 2
                    });
                }
            }
            else {
                // Reset flying speed when not flying
                this.player.currentFlySpeed = 0;
            }
            
            // Apply movement
            this.player.x += this.player.speedX;
            this.player.y += this.player.speedY;
            
            // Check ground collision
            const groundHeight = this.getGroundHeight(this.player.x);
            if (this.player.y >= groundHeight - this.player.height / 2) {
                this.player.y = groundHeight - this.player.height / 2;
                this.player.speedY = 0;
                this.player.canJump = true;
                this.player.doubleJump = true;
                
                // Check if on a slope
                const groundAngle = this.getTerrainAngle(this.player.x);
                if (Math.abs(groundAngle) > 0.3) {
                    this.player.isSliding = true;
                    
                    // Apply sliding force based on angle
                    const slideForce = Math.sin(groundAngle) * 0.5;
                    this.player.speedX += slideForce;
                }
                else {
                    this.player.isSliding = false;
                }
            }
            else {
                this.player.isSliding = false;
            }
        }

        // Calculate new position
        const newX = this.player.x + this.player.speedX;
        const newY = this.player.y + this.player.speedY;
        
        // Create temporary player object with new position for collision check
        const tempPlayer = {
            x: newX,
            y: newY,
            width: this.player.width,
            height: this.player.height
        };
        
        // Only update position if not colliding with walls
        if (!this.checkWallCollisions(tempPlayer)) {
            this.player.x = newX;
            this.player.y = newY;
        }
        
        // Update viewport to follow player - remove clamping on the left side
        const viewportCenterX = this.viewportX + this.canvas.width / 2;
        
        // Calculate how far the player is from the center of the screen
        const playerOffsetFromCenter = this.player.x - viewportCenterX;
        
        // If player is more than 100 pixels from center, move the viewport
        if (Math.abs(playerOffsetFromCenter) > 100) {
            this.viewportX += playerOffsetFromCenter * 0.1; // Smooth camera movement
        }
        
        // Only prevent going beyond the right world boundary
        if (this.viewportX > this.worldWidth - this.canvas.width) {
            this.viewportX = this.worldWidth - this.canvas.width;
        }

        // Keep player within screen bounds
        this.player.y = Math.max(20, Math.min(this.canvas.height - 20, this.player.y));
        
        // Update gun angle to match ship rotation
        const dx = this.cursor.x - (this.player.x - this.viewportX);
        const dy = this.cursor.y - this.player.y;
        this.player.gunAngle = Math.atan2(dy, dx);

        // Update enemies with wall collisions
        this.enemies = this.enemies.filter(enemy => {
            const newX = enemy.x + enemy.speedX;
            const tempEnemy = {
                x: newX,
                y: enemy.y,
                width: enemy.width,
                height: enemy.height
            };
            
            if (!this.checkWallCollisions(tempEnemy)) {
                enemy.x = newX;
            } else {
                enemy.speedX *= -1; // Reverse direction if hitting wall
            }
            
            // ... rest of enemy update code ...
            return true;
        });
        
        // Add left boundary prevention
        if (this.viewportX < 0) {
            this.viewportX = 0;
        }

        // Generate more terrain if needed
        if (this.player.x > this.worldWidth - this.canvas.width) {
            this.worldWidth += 3000;
            this.generateTerrain();
        }
        
        // Update player rotation based on terrain
        this.player.rotation = this.player.isSliding ? this.getTerrainAngle(this.player.x) : 0;

        // Update cape animation when flying
        if (this.player.canFly) {
            this.player.capeAnimation += 0.1;
        }

        // Update blood particles
        this.updateBloodParticles();

        // Update dying enemies
        this.deadEnemies = this.deadEnemies.filter(enemy => {
            enemy.deathTimer++;
            enemy.rotation += 0.1;
            enemy.y += enemy.speedY;
            enemy.speedY += 0.5; // Gravity
            enemy.x += 3; // Drift right while falling

            if (enemy.deathTimer > 100) {
                this.createBloodEffect(enemy.x, enemy.y);
            }

            return enemy.deathTimer < 150; // Remove after animation
        });

        // Handle dashing
        if (this.player.isDashing) {
            // Use movement direction for dash
            const dashX = this.player.speedX;
            const dashY = this.player.speedY;
            
            // Apply dash movement
            const newX = this.player.x + dashX;
            const newY = this.player.y + dashY;
            
            // Check for wall collisions before applying dash
            const tempPlayer = {
                x: newX,
                y: newY,
                width: this.player.width,
                height: this.player.height
            };
            
            if (!this.checkWallCollisions(tempPlayer)) {
                this.player.x = newX;
                this.player.y = newY;
            }
            
            // Decrease dash duration
            this.player.dashDuration--;
            if (this.player.dashDuration <= 0) {
                this.player.isDashing = false;
                this.player.dashDuration = 15; // Reset dash duration
            }
        }
        
        // Update dash cooldown
        if (this.player.dashCooldown > 0) {
            this.player.dashCooldown--;
        }

        // Update nuke cooldown
        if (!this.nukeReady) {
            this.nukeCooldown--;
            if (this.nukeCooldown <= 0) {
                this.nukeReady = true;
            }
        }

        // Update spinning lasers
        if (this.spinningLasers) {
            this.spinningLaserDuration--;
            if (this.spinningLaserDuration <= 0) {
                this.spinningLasers = null;
            } else {
                // Rotate the lasers
                this.spinningLaserAngle += 0.1; // Rotation speed
                
                // Check enemy collisions for all lasers
                this.enemies = this.enemies.filter(enemy => {
                    // Check if any laser hits the enemy
                    for (const laser of this.spinningLasers) {
                        laser.x = this.player.x;
                        laser.y = this.player.y;
                        laser.angle = this.spinningLaserAngle + (Math.PI * 2 * this.spinningLasers.indexOf(laser)) / 8;

                        // Calculate laser end point
                        const laserEndX = laser.x + Math.cos(laser.angle) * 2000;
                        const laserEndY = laser.y + Math.sin(laser.angle) * 2000;

                        // Check if laser line intersects with enemy
                        if (this.lineIntersectsBox(
                            laser.x, laser.y,
                            laserEndX, laserEndY,
                            enemy.x, enemy.y,
                            enemy.width, enemy.height
                        )) {
                            this.createBloodEffect(enemy.x, enemy.y);
                            this.audio.play('enemyDeath');
                            this.gameState.killCount++;
                            this.waveSystem.waveKills++;
                            this.coins++; // Add coins for kills
                            return false;
                        }
                    }
                    return true;
                });
            }
        }
        
        // Update spinning laser cooldown
        if (this.spinningLaserCooldown > 0) {
            this.spinningLaserCooldown--;
        }

        // Update healing
        if (this.isHealing) {
            this.healingProgress++;
            
            // Create healing particles
            if (this.healingProgress % 5 === 0) {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 30 + Math.random() * 20;
                    this.healingParticles.push({
                        x: this.player.x + Math.cos(angle) * distance,
                        y: this.player.y + Math.sin(angle) * distance,
                        targetX: this.player.x,
                        targetY: this.player.y,
                        life: 20
                    });
                }
            }

            // Apply healing gradually
            if (this.healingProgress <= this.healingDuration) {
                const healPerFrame = this.healAmount / this.healingDuration;
                this.player.health = Math.min(this.player.maxHealth, this.player.health + healPerFrame);
            }

            if (this.healingProgress >= this.healingDuration) {
                this.isHealing = false;
                this.healingProgress = 0;
            }
        }

        // Update healing particles
        this.healingParticles = this.healingParticles.filter(particle => {
            const dx = particle.targetX - particle.x;
            const dy = particle.targetY - particle.y;
            particle.x += dx * 0.2;
            particle.y += dy * 0.2;
            particle.life--;
            return particle.life > 0;
        });

        // Wave system logic
        if (this.waveSystem.isBreak) {
            // During break period
            this.waveSystem.breakTimer--;
            
            // Break is over, start a new wave
            if (this.waveSystem.breakTimer <= 0) {
                this.waveSystem.isBreak = false;
                this.waveSystem.currentWave++;
                this.waveSystem.enemiesSpawned = 0;
                this.waveSystem.waveKills = 0; // Reset wave kill counter
                this.gameState.currentWave = this.waveSystem.currentWave;
                
                // Calculate new break duration for next wave (5 seconds less, minimum 5 seconds)
                const reductionAmount = (this.waveSystem.currentWave - 1) * 300; // 5 seconds = 300 frames
                this.waveSystem.breakDuration = Math.max(300, this.waveSystem.initialBreakDuration - reductionAmount);
                
                // Display wave start message
                this.waveStartTime = Date.now();
                this.waveStartMessage = `WAVE ${this.waveSystem.currentWave} START!`;
                
                // Spawn exactly 20 enemies at once for the start of the wave
                for (let i = 0; i < 20; i++) {
                    this.spawnEnemy();
                }
                this.waveSystem.enemiesSpawned = 20;
            }
        } else {
            // Check if wave should end based on kill count (20 kills)
            if (this.waveSystem.waveKills >= 20) {
                this.waveSystem.isBreak = true;
                this.waveSystem.breakTimer = this.waveSystem.breakDuration;
                
                // Display break message
                this.breakStartTime = Date.now();
                this.breakMessage = `BREAK TIME: ${Math.ceil(this.waveSystem.breakDuration / 60)} SECONDS`;
                
                // Clear remaining enemies
                this.enemies = [];

                // Add coins for completing the wave
                this.coins++;

                // Enable shop for the break duration
                this.shop.canOpen = true;
                this.shop.timeRemaining = this.shop.shopDuration;
            }
            // Check if we need to spawn more enemies
            else if (this.enemies.length < 20 && this.waveSystem.enemiesSpawned < this.waveSystem.enemiesPerWave) {
                // Calculate how many more we can spawn up to 20 at a time
                const numToSpawn = Math.min(20 - this.enemies.length, 
                    this.waveSystem.enemiesPerWave - this.waveSystem.enemiesSpawned);
                
                // Spawn them all at once
                for (let i = 0; i < numToSpawn; i++) {
                    this.spawnEnemy();
                }
            }
        }

        // Update shop timer
        if (this.shop.canOpen && this.shop.timeRemaining > 0) {
            this.shop.timeRemaining--;
            if (this.shop.timeRemaining <= 0) {
                this.shop.isOpen = false;
                this.shop.canOpen = false;
            }
        }

        // Update landmines
        this.landmines = this.landmines.filter(mine => {
            // Apply gravity and movement
            mine.speedY += 0.5;
            mine.x += mine.speedX;
            mine.y += mine.speedY;

            // Check ground collision
            const groundHeight = this.getGroundHeight(mine.x);
            if (mine.y >= groundHeight - mine.height) {
                mine.y = groundHeight - mine.height;
                mine.speedX = 0;
                mine.speedY = 0;
                if (mine.armDelay > 0) {
                    mine.armDelay--;
                } else {
                    mine.armed = true;
                }
            }

            // Check if armed mine is triggered by any entity
            if (mine.armed) {
                // Check player collision
                if (this.checkCollision(mine, {
                    x: this.player.x - this.player.width/2,
                    y: this.player.y - this.player.height/2,
                    width: this.player.width,
                    height: this.player.height
                })) {
                    this.createLandmineExplosion(mine.x, mine.y);
                    return false;
                }

                // Check enemy collisions
                for (const enemy of this.enemies) {
                    if (this.checkCollision(mine, enemy)) {
                        this.createLandmineExplosion(mine.x, mine.y);
                        return false;
                    }
                }
            }

            return true;
        });

        // Apply tilt controls for mobile
        if (this.isMobile && this.mobileControls.tiltControls.enabled && this.gameStarted) {
            const tiltX = this.mobileControls.tiltControls.tiltX;
            
            // Apply left/right movement based on tilt
            if (tiltX > 0.1) {
                this.keys.d = true;
                this.keys.a = false;
                this.player.speedX += this.player.acceleration * (tiltX * this.mobileControls.tiltControls.sensitivity);
            } else if (tiltX < -0.1) {
                this.keys.a = true;
                this.keys.d = false;
                this.player.speedX += this.player.acceleration * (tiltX * this.mobileControls.tiltControls.sensitivity);
            } else {
                this.keys.a = false;
                this.keys.d = false;
            }
            
            // Cap horizontal speed
            if (this.player.speedX > this.player.maxSpeedX) {
                this.player.speedX = this.player.maxSpeedX;
            } else if (this.player.speedX < -this.player.maxSpeedX) {
                this.player.speedX = -this.player.maxSpeedX;
            }
        }

        // Add near the end of the update method, after updating player position
        if (this.isMultiplayer && socket && socket.readyState === WebSocket.OPEN) {
            // Send player data to server
            socket.send(JSON.stringify({
                type: 'update',
                player: {
                    x: this.player.x,
                    y: this.player.y,
                    speedX: this.player.speedX,
                    speedY: this.player.speedY,
                    gunAngle: this.player.gunAngle,
                    health: this.player.health,
                    currentWeapon: this.player.currentWeapon
                }
            }));
        }

        // Add after updating local bullets in the update method
        if (this.isMultiplayer) {
            // Update remote bullets
            Object.keys(remoteBullets).forEach(id => {
                const bullet = remoteBullets[id];
                
                // Move the bullet
                bullet.x += bullet.dx;
                bullet.y += bullet.dy;
                
                // Check terrain collision
                const terrainY = this.getGroundHeight(bullet.x);
                if (bullet.y >= terrainY) {
                    // Create explosion and remove bullet instead of bouncing
                    this.createExplosion(bullet.x, bullet.y);
                    this.deformTerrain(bullet.x, bullet.y, this.deformationRadius);
                    
                    // Remove bullet
                    delete remoteBullets[id];
                    
                    // Send bullet removal to server
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'bulletRemove',
                            id: id
                        }));
                    }
                    return;
                }
                
                // Check collision with player
                if (bullet.playerId !== playerId) {
                    const playerBox = {
                        x: this.player.x - this.player.width/2,
                        y: this.player.y - this.player.height/2,
                        width: this.player.width,
                        height: this.player.height
                    };
                    
                    if (this.pointInBox(bullet.x, bullet.y, playerBox.x, playerBox.y, playerBox.width, playerBox.height)) {
                        // Player hit by bullet
                        this.player.health -= 10;
                        
                        // Create hit effect
                        for (let i = 0; i < 5; i++) {
                            this.particles.push({
                                x: bullet.x,
                                y: bullet.y,
                                dx: (Math.random() - 0.5) * 2,
                                dy: (Math.random() - 0.5) * 2,
                                life: 20,
                                color: '#FF0000',
                                size: 2
                            });
                        }
                        
                        // Play hit sound
                        this.audio.play('hit');
                        
                        // Send player hit to server
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'playerHit',
                                targetId: playerId
                            }));
                        }
                        
                        // Remove bullet
                        delete remoteBullets[id];
                        
                        // Send bullet removal to server
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({
                                type: 'bulletRemove',
                                id: id
                            }));
                        }
                    }
                }
                
                // Check if bullet is out of bounds
                if (bullet.x < 0 || bullet.x > this.worldWidth || 
                    bullet.y < 0 || bullet.y > this.canvas.height) {
                    delete remoteBullets[id];
                    
                    // Send bullet removal to server
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'bulletRemove',
                            id: id
                        }));
                    }
                }
            });
        }
    }

    drawParticles() {
        for (const particle of this.particles) {
            const screenX = particle.x - this.viewportX;
            const alpha = particle.life / this.particleLifespan;
            
            this.ctx.beginPath();
            this.ctx.arc(screenX, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            this.ctx.fill();
        }
    }

    drawMetallicTerrain() {
        // Draw appropriate background based on sprite mode
        if (this.isSpaceship) {
            this.drawGalaxyBackground();
        } else {
            this.drawCityBackground();
        }

        // Draw terrain
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height);
        
        for (let i = 0; i < this.terrain.length; i++) {
            const screenX = this.terrain[i].x - this.viewportX;
            if (screenX >= -50 && screenX <= this.canvas.width + 50) {
                if (i === 0 || screenX < 0) {
                    this.ctx.moveTo(screenX, this.terrain[i].y);
                } else {
                    this.ctx.lineTo(screenX, this.terrain[i].y);
                }
            }
        }
        
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.closePath();
        
        // Terrain gradient based on current mode
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        if (this.isSpaceship) {
            // Space terrain
            gradient.addColorStop(0, '#1a1a3a');
            gradient.addColorStop(0.5, '#2a2a4a');
            gradient.addColorStop(1, '#0a0a2a');
        } else {
            // City concrete
            gradient.addColorStop(0, '#555555');
            gradient.addColorStop(0.5, '#666666');
            gradient.addColorStop(1, '#444444');
        }
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Terrain edge highlight
        this.ctx.strokeStyle = this.isSpaceship ? '#4444aa' : '#777777';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Apply stored deformations
        for (const [x, y] of this.terrainDamage) {
            const index = Math.floor(x / (this.worldWidth / this.terrain.length));
            if (this.terrain[index]) {
                this.terrain[index].y = y;
            }
        }
    }

    drawGalaxyBackground() {
        // Create dark space gradient
        const spaceGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        spaceGradient.addColorStop(0, '#000033');
        spaceGradient.addColorStop(0.5, '#000066');
        spaceGradient.addColorStop(1, '#000044');
        
        // Fill background
        this.ctx.fillStyle = spaceGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars (using a deterministic pattern based on viewport)
        const viewportSection = Math.floor(this.viewportX / 100);
        this.ctx.fillStyle = '#FFFFFF';
        
        for (let i = 0; i < 200; i++) {
            const seed = i * (viewportSection + 1);
            const x = (Math.sin(seed) * 10000) % this.canvas.width;
            const y = (Math.cos(seed) * 10000) % this.canvas.height;
            const size = (Math.sin(seed * 2) + 1) * 2;
            
            // Twinkle effect
            const alpha = (Math.sin(Date.now() * 0.003 + seed) + 1) * 0.5;
            this.ctx.globalAlpha = alpha;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw distant nebulas
        this.ctx.globalAlpha = 0.2;
        for (let i = 0; i < 3; i++) {
            const seed = i * (viewportSection + 1);
            const x = (Math.sin(seed) * 10000) % this.canvas.width;
            const y = (Math.cos(seed) * 10000) % (this.canvas.height * 0.7);
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 200);
            gradient.addColorStop(0, '#4444FF');
            gradient.addColorStop(0.5, '#2222AA');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 200, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }

    drawCityBackground() {
        // Fill background with solid black
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawLasers() {
        this.ctx.lineWidth = this.laserWidth;
        
        // Draw regular lasers
        for (const laser of this.lasers) {
            const screenX = laser.x - this.viewportX;
            
            this.ctx.strokeStyle = laser.color || '#00FF00';  // Default to player color if not specified
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, laser.y);
            this.ctx.lineTo(screenX - laser.dx, laser.y - laser.dy);
            this.ctx.stroke();
        }
        
        // Draw special laser if active
        if (this.specialLaser) {
            const screenX = this.specialLaser.x - this.viewportX;
            this.ctx.strokeStyle = '#00FF00';  // Changed to match player color
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, this.specialLaser.y);
            this.ctx.lineTo(screenX + Math.cos(this.specialLaser.angle) * 2000, 
                          this.specialLaser.y + Math.sin(this.specialLaser.angle) * 2000);
            this.ctx.stroke();
            
            // Add glow effect
            this.ctx.strokeStyle = '#00FF0044';  // Changed to match player color with transparency
            this.ctx.lineWidth = 16;
            this.ctx.stroke();
        }

        // Draw spinning lasers if active
        if (this.spinningLasers) {
            this.spinningLasers.forEach(laser => {
                const screenX = laser.x - this.viewportX;
                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, laser.y);
                this.ctx.lineTo(
                    screenX + Math.cos(laser.angle) * 2000,
                    laser.y + Math.sin(laser.angle) * 2000
                );
                this.ctx.stroke();

                // Add glow effect
                this.ctx.strokeStyle = '#00FF0044';
                this.ctx.lineWidth = 8;
                this.ctx.stroke();
            });
        }
    }

    drawPlayer() {
        const screenX = this.player.x - this.viewportX;
        
        this.ctx.save();
        this.ctx.translate(screenX + this.player.width/2, this.player.y + this.player.height/2);
        
        if (this.isSpaceship) {
            // Draw spaceship
            this.ctx.rotate(this.player.gunAngle);
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 3;
            
            // Ship body
            this.ctx.beginPath();
            this.ctx.moveTo(25, 0); // Nose
            this.ctx.lineTo(-15, -12); // Top wing
            this.ctx.lineTo(-10, 0); // Back middle
            this.ctx.lineTo(-15, 12); // Bottom wing
            this.ctx.lineTo(25, 0); // Back to nose
            this.ctx.stroke();
            
            // Engine flames
            if (this.keys.w || this.keys.a || this.keys.d) {
                this.ctx.beginPath();
                const flameLength = 15 + Math.random() * 10;
                this.ctx.moveTo(-10, -2);
                this.ctx.lineTo(-10 - flameLength, 0);
                this.ctx.lineTo(-10, 2);
                this.ctx.strokeStyle = '#ff4400';
                this.ctx.stroke();
            }
            
            // Cockpit
            this.ctx.beginPath();
            this.ctx.arc(5, 0, 5, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.stroke();
        } else {
            // Draw stick figure
            this.ctx.rotate(0); // Reset rotation for stick figure
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 2;
            
            // Taller and more muscular proportions
            const headSize = 7;
            const bodyLength = 25;
            const armLength = 12;
            const legLength = 20;
            
            // Head
            this.ctx.beginPath();
            this.ctx.arc(0, -bodyLength - headSize, headSize, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Headband (LeBron's signature)
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, -bodyLength - headSize, headSize + 1, -Math.PI * 0.8, Math.PI * 0.8);
            this.ctx.stroke();
            
            // Return to green color for body
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 2;
            
            // Body (slightly wider for athletic build)
            this.ctx.beginPath();
            this.ctx.moveTo(0, -bodyLength);
            this.ctx.lineTo(0, 0);
            this.ctx.stroke();
            
            // Arms (more muscular)
            this.ctx.beginPath();
            const rightArmX = Math.cos(this.player.gunAngle) * armLength;
            const rightArmY = Math.sin(this.player.gunAngle) * armLength;
            
            // Left arm (muscular curve)
            this.ctx.moveTo(-3, -bodyLength + 8);
            this.ctx.quadraticCurveTo(-12, -bodyLength + 15, -armLength, -5);
            
            // Right arm follows gun angle
            this.ctx.moveTo(0, -bodyLength + 8);
            this.ctx.lineTo(rightArmX, rightArmY);
            this.ctx.stroke();
            
            // Legs (longer and more athletic)
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(-8, legLength/2, -10, legLength);
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(8, legLength/2, 10, legLength);
            this.ctx.stroke();
            
            // Jersey number 23
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('23', 0, -bodyLength + 15);
            
            // Draw gun
            this.ctx.beginPath();
            this.ctx.save();
            this.ctx.translate(rightArmX, rightArmY);
            this.ctx.rotate(this.player.gunAngle);
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(15, 0);
            this.ctx.stroke();
            this.ctx.restore();
        }
        
        this.ctx.restore();
        
        // Always play engine sound when moving
        if (this.keys.w || this.keys.a || this.keys.d) {
            this.audio.play('fly');
        }
    }

    drawEnemies() {
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;

        // Draw regular enemies
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy, false);
        }

        // Draw dying enemies
        for (const enemy of this.deadEnemies) {
            this.drawEnemy(enemy, true);
        }
    }

    drawEnemy(enemy, isDying) {
        const screenX = enemy.x - this.viewportX;
        
        this.ctx.save();
        this.ctx.translate(screenX, enemy.y);
        
        if (isDying) {
            this.ctx.rotate(enemy.rotation);
            this.ctx.globalAlpha = Math.max(0, 1 - enemy.deathTimer / 150);
            this.ctx.strokeStyle = enemy.color || '#ff0000';
        } else {
            this.ctx.strokeStyle = '#ff0000';
        }
        
        // Reset stroke style for enemy
        this.ctx.strokeStyle = enemy.color || '#ff0000';
        
        // Body
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(0, 10);
        this.ctx.stroke();
        
        // Head
        this.ctx.beginPath();
        this.ctx.arc(0, -20, 5, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Arms with gun
        this.ctx.beginPath();
        this.ctx.moveTo(0, -5);
        this.ctx.lineTo(-8, 5);
        this.ctx.moveTo(0, -5);
        this.ctx.lineTo(15, -5);
        this.ctx.stroke();
        
        // Legs
        this.ctx.beginPath();
        this.ctx.moveTo(0, 10);
        this.ctx.lineTo(-8, 20);
        this.ctx.moveTo(0, 10);
        this.ctx.lineTo(8, 20);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawEnemyBullets() {
        this.ctx.fillStyle = '#FF6600';
        
        for (const bullet of this.enemyBullets) {
            const screenX = bullet.x - this.viewportX;
            
            // Draw bullet
            this.ctx.beginPath();
            this.ctx.arc(screenX, bullet.y, bullet.width/2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw bullet trail
            this.ctx.strokeStyle = '#FF3300';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, bullet.y);
            this.ctx.lineTo(screenX - bullet.speedX * 3, bullet.y - bullet.speedY * 3);
            this.ctx.stroke();
        }
    }

    drawUI() {
        // Draw crosshair at cursor position
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;
        const crosshairSize = 20;
        
        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(this.cursor.x - crosshairSize, this.cursor.y);
        this.ctx.lineTo(this.cursor.x + crosshairSize, this.cursor.y);
        this.ctx.stroke();
        
        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(this.cursor.x, this.cursor.y - crosshairSize);
        this.ctx.lineTo(this.cursor.x, this.cursor.y + crosshairSize);
        this.ctx.stroke();
        
        // Small circle in the middle
        this.ctx.beginPath();
        this.ctx.arc(this.cursor.x, this.cursor.y, 2, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw distance counter at top
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Distance: ${this.gameState.distance}m / ${this.gameState.winDistance}m`, 10, 30);
        
        // Draw kill counter at bottom right with background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const killText = `Kills: ${this.gameState.killCount}`;
        const killMetrics = this.ctx.measureText(killText);
        this.ctx.fillRect(this.canvas.width - killMetrics.width - 30, this.canvas.height - 40, killMetrics.width + 20, 30);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(killText, this.canvas.width - killMetrics.width - 20, this.canvas.height - 20);
        
        // Draw ammo counter at bottom left with fire mode indicator
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, this.canvas.height - 70, 150, 60);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(`AMMO: ${this.player.ammo}`, 20, this.canvas.height - 40);
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = this.player.isFullAuto ? '#00ff00' : '#ff9900';
        this.ctx.fillText(this.player.isFullAuto ? 'FULL AUTO' : 'SEMI AUTO', 20, this.canvas.height - 20);
        
        // Add weapon indicator
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`WEAPON: ${this.player.currentWeapon.toUpperCase()}`, 20, this.canvas.height - 90);
        
        if (this.gameState.gameWon) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '40px Arial';
            this.ctx.fillText('You Win!', this.canvas.width/2 - 70, this.canvas.height/2);
        }
        
        // Draw zoomed crosshair for sniper
        if (this.player.currentWeapon === 'sniper' && this.player.isZoomed) {
            this.ctx.save();
            this.ctx.translate(this.cursor.x, this.cursor.y);
            this.ctx.scale(2, 2);
            this.ctx.translate(-this.cursor.x, -this.cursor.y);
            
            // Draw zoomed crosshair
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(this.cursor.x, this.cursor.y, 20, 0, Math.PI * 2);
            this.ctx.moveTo(this.cursor.x - 30, this.cursor.y);
            this.ctx.lineTo(this.cursor.x + 30, this.cursor.y);
            this.ctx.moveTo(this.cursor.x, this.cursor.y - 30);
            this.ctx.lineTo(this.cursor.x, this.cursor.y + 30);
            this.ctx.stroke();
            
            this.ctx.restore();
        }

        // Draw nuke cooldown
        if (!this.nukeReady) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, this.canvas.height - 120, 150, 30);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`NUKE: ${Math.ceil(this.nukeCooldown / 60)}s`, 20, this.canvas.height - 100);
        } else {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, this.canvas.height - 120, 150, 30);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('NUKE: READY', 20, this.canvas.height - 100);
        }

        // Draw special laser cooldown if it's not ready
        if (this.specialLaserCooldown > 0) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, this.canvas.height - 150, 150, 30);
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`LASER: ${Math.ceil(this.specialLaserCooldown / 60)}s`, 20, this.canvas.height - 130);
        } else if (!this.specialLaser) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, this.canvas.height - 150, 150, 30);
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('LASER: READY', 20, this.canvas.height - 130);
        }

        // Draw health bar at top left
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 30);
        
        // Health bar background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(15, 15, 190, 20);
        
        // Health bar fill
        const healthPercent = this.player.health / this.player.maxHealth;
        this.ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(15, 15, 190 * healthPercent, 20);
        
        // Health text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText(`${Math.ceil(this.player.health)} / ${this.player.maxHealth}`, 85, 31);

        // Draw wave information
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`WAVE: ${this.waveSystem.currentWave}`, 20, 110);
        
        // Draw wave start message
        if (this.waveStartMessage && Date.now() - this.waveStartTime < 3000) {
            this.ctx.font = '30px Arial';
            this.ctx.fillStyle = '#FF0000';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.waveStartMessage, this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.ctx.textAlign = 'left';
        }
        
        // Draw break message
        if (this.waveSystem.isBreak) {
            this.ctx.font = '30px Arial';
            this.ctx.fillStyle = '#00FF00';
            this.ctx.textAlign = 'center';
            const secondsLeft = Math.ceil(this.waveSystem.breakTimer / 60);
            this.ctx.fillText(`BREAK TIME: ${secondsLeft} SECONDS`, this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.ctx.textAlign = 'left';
        }
        
        // Show laser cooldown
        if (this.spinningLaserCooldown > 0) {
            const cooldownPercent = this.spinningLaserCooldown / this.spinningLaserCooldownTime;
            const barWidth = 100;
            const barHeight = 10;
            const x = 20;
            const y = 150;
            
            // Draw cooldown bar background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw cooldown bar
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(x, y, barWidth * (1 - cooldownPercent), barHeight);
            
            // Draw label
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('Laser Beam Cooldown', x, y - 5);
        }

        // Draw coins
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 50, 150, 30);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Coins: ${this.coins}`, 20, 70);

        // Draw shop button only when available
        if (this.shop.canOpen && this.shop.timeRemaining > 0) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(10, 90, 150, 30);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(`Shop [B] - ${Math.ceil(this.shop.timeRemaining / 60)}s`, 20, 110);
        }

        // Draw shop if open
        if (this.shop.isOpen) {
            // Pause game rendering
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Shop background
            this.ctx.fillStyle = 'rgba(50, 50, 50, 0.95)';
            this.ctx.fillRect(this.canvas.width/2 - 200, this.canvas.height/2 - 150, 400, 300);
            
            // Shop title with timer
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SHOP', this.canvas.width/2, this.canvas.height/2 - 120);
            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(`Time Remaining: ${Math.ceil(this.shop.timeRemaining / 60)}s`, 
                this.canvas.width/2, this.canvas.height/2 - 90);
            
            // Minigun item
            const minigun = this.shop.items.minigun;
            this.ctx.font = '16px Arial';
            if (!minigun.purchased) {
                this.ctx.fillStyle = this.coins >= minigun.cost ? '#00FF00' : '#FF0000';
                this.ctx.fillText(`${minigun.name} - ${minigun.cost} coins`, this.canvas.width/2, this.canvas.height/2 - 40);
                this.ctx.font = '12px Arial';
                this.ctx.fillStyle = '#AAAAAA';
                this.ctx.fillText('Press 1 to buy', this.canvas.width/2, this.canvas.height/2 - 20);
            } else {
                this.ctx.fillStyle = '#888888';
                this.ctx.fillText(`${minigun.name} - PURCHASED`, this.canvas.width/2, this.canvas.height/2 - 40);
            }
            
            // Shop close instruction
            this.ctx.fillStyle = '#AAAAAA';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('Press B to close shop', this.canvas.width/2, this.canvas.height/2 + 120);
            
            this.ctx.textAlign = 'left';
        }

        // Draw mobile controls if on mobile device
        if (this.isMobile) {
            // Draw joystick if not using tilt controls
            if (!this.mobileControls.tiltControls.enabled && this.mobileControls.joystick.active) {
                // Draw base
                this.ctx.beginPath();
                this.ctx.arc(
                    this.mobileControls.joystick.startX,
                    this.mobileControls.joystick.startY,
                    this.mobileControls.joystick.baseRadius,
                    0, Math.PI * 2
                );
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.stroke();

                // Draw knob
                this.ctx.beginPath();
                this.ctx.arc(
                    this.mobileControls.joystick.currentX,
                    this.mobileControls.joystick.currentY,
                    this.mobileControls.joystick.knobRadius,
                    0, Math.PI * 2
                );
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.fill();
            }

            // Position the buttons on the right side
            this.mobileControls.shootButton.x = this.canvas.width - 80;
            this.mobileControls.shootButton.y = this.canvas.height - 100;
            
            this.mobileControls.jumpButton.x = this.canvas.width - 160;
            this.mobileControls.jumpButton.y = this.canvas.height - 100;
            
            this.mobileControls.flyButton.x = this.canvas.width - 120;
            this.mobileControls.flyButton.y = this.canvas.height - 180;
            
            this.mobileControls.weaponButton.x = this.canvas.width - 80;
            this.mobileControls.weaponButton.y = this.canvas.height - 260;

            // Draw shoot button
            this.ctx.beginPath();
            this.ctx.arc(
                this.mobileControls.shootButton.x,
                this.mobileControls.shootButton.y,
                this.mobileControls.shootButton.radius,
                0, Math.PI * 2
            );
            this.ctx.fillStyle = this.mobileControls.shootButton.pressed ? 
                'rgba(255, 0, 0, 0.7)' : 'rgba(255, 0, 0, 0.5)';
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SHOOT', this.mobileControls.shootButton.x, 
                this.mobileControls.shootButton.y);

            // Draw jump button
            this.ctx.beginPath();
            this.ctx.arc(
                this.mobileControls.jumpButton.x,
                this.mobileControls.jumpButton.y,
                this.mobileControls.jumpButton.radius,
                0, Math.PI * 2
            );
            this.ctx.fillStyle = this.mobileControls.jumpButton.pressed ? 
                'rgba(0, 255, 0, 0.7)' : 'rgba(0, 255, 0, 0.5)';
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('JUMP', this.mobileControls.jumpButton.x, 
                this.mobileControls.jumpButton.y);

            // Draw fly button
            this.ctx.beginPath();
            this.ctx.arc(
                this.mobileControls.flyButton.x,
                this.mobileControls.flyButton.y,
                this.mobileControls.flyButton.radius,
                0, Math.PI * 2
            );
            this.ctx.fillStyle = this.mobileControls.flyButton.pressed ? 
                'rgba(255, 165, 0, 0.7)' : 'rgba(255, 165, 0, 0.5)';
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('FLY', this.mobileControls.flyButton.x, 
                this.mobileControls.flyButton.y);

            // Draw weapon switch button
            this.ctx.beginPath();
            this.ctx.arc(
                this.mobileControls.weaponButton.x,
                this.mobileControls.weaponButton.y,
                this.mobileControls.weaponButton.radius,
                0, Math.PI * 2
            );
            this.ctx.fillStyle = this.mobileControls.weaponButton.pressed ? 
                'rgba(0, 0, 255, 0.7)' : 'rgba(0, 0, 255, 0.5)';
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('WEAPON', this.mobileControls.weaponButton.x, 
                this.mobileControls.weaponButton.y);

            // Draw tilt indicator
            if (this.mobileControls.tiltControls.enabled) {
                const tiltX = this.mobileControls.tiltControls.tiltX;
                const indicatorWidth = 150;
                const indicatorHeight = 20;
                const indicatorX = 20;
                const indicatorY = 100;
                
                // Draw background bar
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
                
                // Draw tilt level
                const tiltLevel = (tiltX + 1) / 2; // Convert from -1,1 to 0,1
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
                this.ctx.fillRect(
                    indicatorX, 
                    indicatorY, 
                    indicatorWidth * tiltLevel, 
                    indicatorHeight
                );
                
                // Draw center marker
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.fillRect(
                    indicatorX + indicatorWidth/2 - 1, 
                    indicatorY, 
                    2, 
                    indicatorHeight
                );
                
                // Draw text
                this.ctx.fillStyle = '#fff';
                this.ctx.textAlign = 'left';
                this.ctx.fillText('TILT', indicatorX, indicatorY - 5);
            }
        }
    }

    drawWalls() {
        for (const wall of this.walls) {
            const screenX = wall.x - this.viewportX;
            
            this.ctx.save();
            this.ctx.translate(screenX, wall.y);
            
            // Draw wall with solid color
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(-wall.width/2, 0, wall.width, wall.height);
            
            // Draw health bar
            const healthPercentage = wall.health / this.wallHealth;
            this.ctx.fillStyle = `rgba(0, 255, 0, ${healthPercentage})`;
            this.ctx.fillRect(-wall.width/2, -5, wall.width * healthPercentage, 3);
            
            this.ctx.restore();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.gameStarted) {
            this.drawStartScreen();
            // Show crosshair on start screen too
            this.drawCrosshair();
            return;
        }
        
        if (this.player.isDead) {
            this.drawDeathScreen();
            return;
        }
        
        if (this.gameState.gameWon) {
            this.drawVictoryScreen();
            return;
        }
        
        // Apply camera zoom
        this.ctx.save();
        this.ctx.scale(this.cameraZoom, this.cameraZoom);
        
        // Adjust viewport for zoom
        const zoomedWidth = this.canvas.width / this.cameraZoom;
        const zoomedHeight = this.canvas.height / this.cameraZoom;
        
        // Draw terrain
        this.drawMetallicTerrain();
        
        // Draw particles
        this.drawParticles();
        
        // Draw lasers
        this.drawLasers();
        
        // Draw blood particles
        this.drawBloodParticles();
        
        // Draw enemies and their bullets
        this.drawEnemies();
        this.drawEnemyBullets();
        
        // Draw walls before player
        this.drawWalls();
        
        // Draw player
        this.drawPlayer();
        
        // Draw grenades
        for (const grenade of this.grenades) {
            const screenX = grenade.x - this.viewportX;
            this.ctx.fillStyle = grenade.isCharged ? '#FF0000' : '#333333';
            this.ctx.beginPath();
            this.ctx.arc(screenX, grenade.y, grenade.isCharged ? 8 : 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw landmines
        this.landmines.forEach(mine => {
            const screenX = mine.x - this.viewportX;
            this.ctx.fillStyle = mine.armed ? '#FF0000' : '#888888';
            this.ctx.fillRect(screenX - mine.width/2, mine.y - mine.height/2, mine.width, mine.height);
            
            // Draw arming indicator
            if (!mine.armed) {
                this.ctx.fillStyle = '#00FF00';
                const armingProgress = 1 - (mine.armDelay / 60);
                this.ctx.fillRect(screenX - mine.width/2, mine.y - mine.height/2 - 5, 
                    mine.width * armingProgress, 3);
            }
        });
        
        this.ctx.restore();
        
        // Draw UI elements without zoom
        this.drawUI();
        
        // Draw healing effect
        if (this.isHealing) {
            const screenX = this.player.x - this.viewportX;
            
            // Draw healing circle
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(screenX, this.player.y, 40, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw healing progress
            const progress = this.healingProgress / this.healingDuration;
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.beginPath();
            this.ctx.arc(screenX, this.player.y, 45, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress));
            this.ctx.stroke();
        }
        
        // Draw healing particles
        this.ctx.fillStyle = '#00FF00';
        for (const particle of this.healingParticles) {
            const screenX = particle.x - this.viewportX;
            const alpha = particle.life / 20;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(screenX, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
        
        // Always draw the crosshair during gameplay
        this.drawCrosshair();

        // Add after drawing local bullets in the draw method
        if (this.isMultiplayer) {
            // Draw remote bullets
            for (const id in remoteBullets) {
                const bullet = remoteBullets[id];
                const screenX = bullet.x - this.viewportX;
                
                this.ctx.strokeStyle = bullet.color || '#FF0000';
                this.ctx.lineWidth = this.laserWidth;
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, bullet.y);
                this.ctx.lineTo(screenX - bullet.dx, bullet.y - bullet.dy);
                this.ctx.stroke();
            }
            
            // Draw other players
            this.drawOtherPlayers();
        }
    }

    // Add a separate method to draw the crosshair
    drawCrosshair() {
        // Draw outer circle
        this.ctx.beginPath();
        this.ctx.arc(this.cursor.x, this.cursor.y, 10, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw inner dot
        this.ctx.beginPath();
        this.ctx.arc(this.cursor.x, this.cursor.y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
        
        // Draw crosshair lines
        this.ctx.beginPath();
        
        // Horizontal lines
        this.ctx.moveTo(this.cursor.x - 15, this.cursor.y);
        this.ctx.lineTo(this.cursor.x - 7, this.cursor.y);
        this.ctx.moveTo(this.cursor.x + 7, this.cursor.y);
        this.ctx.lineTo(this.cursor.x + 15, this.cursor.y);
        
        // Vertical lines
        this.ctx.moveTo(this.cursor.x, this.cursor.y - 15);
        this.ctx.lineTo(this.cursor.x, this.cursor.y - 7);
        this.ctx.moveTo(this.cursor.x, this.cursor.y + 7);
        this.ctx.lineTo(this.cursor.x, this.cursor.y + 15);
        
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawStartScreen() {
        // Draw animated space background
        const time = Date.now() * 0.001;
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000033');
        gradient.addColorStop(0.5, '#000066');
        gradient.addColorStop(1, '#000044');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw animated stars
        for (let i = 0; i < 100; i++) {
            const x = (Math.sin(i * 567.5 + time) * 0.5 + 0.5) * this.canvas.width;
            const y = (Math.cos(i * 234.5 + time) * 0.5 + 0.5) * this.canvas.height;
            const size = (Math.sin(i + time) * 0.5 + 1.5) * 2;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(i + time) * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        if (!this.showCharacterSelect) {
            // Draw title with glow effect
            this.ctx.shadowColor = '#00FF00';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 72px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('SPACE WARRIOR', this.canvas.width / 2, this.canvas.height / 3);

            // Draw animated start button
            const buttonWidth = 300;
            const buttonHeight = 60;
            const buttonX = this.canvas.width / 2 - buttonWidth / 2;
            const buttonY = this.canvas.height * 0.6;
            const buttonGlow = Math.sin(time * 4) * 10;

            // Button glow effect
            this.ctx.shadowColor = '#00FF00';
            this.ctx.shadowBlur = 20 + buttonGlow;
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

            // Button text
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.fillText('START GAME', this.canvas.width / 2, buttonY + buttonHeight / 2);

            // Store button coordinates for click handling
            this.startButton = {
                x: buttonX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            };
        } else {
            // Draw character selection title
            this.ctx.shadowColor = '#00FF00';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.fillText('Choose Your Character', this.canvas.width / 2, this.canvas.height / 4);

            // Draw selection boxes with hover effects
            const boxWidth = 250;
            const boxHeight = 250;
            const spacing = 100;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;

            // Spaceship box
            this.drawCharacterBox(
                centerX - boxWidth - spacing/2,
                centerY - boxHeight/2,
                boxWidth,
                boxHeight,
                'SPACESHIP',
                'Fast & Agile',
                this.cursor.x,
                this.cursor.y,
                true
            );

            // Stick figure box
            this.drawCharacterBox(
                centerX + spacing/2,
                centerY - boxHeight/2,
                boxWidth,
                boxHeight,
                'STICK WARRIOR',
                'Strong & Skilled',
                this.cursor.x,
                this.cursor.y,
                false
            );

            // Store box coordinates for click handling
            this.characterButtons = {
                spaceship: {
                    x: centerX - boxWidth - spacing/2,
                    y: centerY - boxHeight/2,
                    width: boxWidth,
                    height: boxHeight
                },
                stickFigure: {
                    x: centerX + spacing/2,
                    y: centerY - boxHeight/2,
                    width: boxWidth,
                    height: boxHeight
                }
            };
        }

        // Remove shadow effects
        this.ctx.shadowBlur = 0;
    }

    drawCharacterBox(x, y, width, height, title, subtitle, mouseX, mouseY, isSpaceship) {
        // Check if mouse is over the box
        const isHovered = mouseX >= x && mouseX <= x + width &&
                         mouseY >= y && mouseY <= y + height;

        // Box glow effect
        this.ctx.shadowColor = '#00FF00';
        this.ctx.shadowBlur = isHovered ? 30 : 10;
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = isHovered ? 4 : 2;
        this.ctx.strokeRect(x, y, width, height);

        // Character preview with animation
        const time = Date.now() * 0.002;
        const hoverOffset = isHovered ? Math.sin(time * 3) * 10 : 0;

        this.ctx.save();
        this.ctx.translate(x + width/2, y + height/2 + hoverOffset);
        
        if (isSpaceship) {
            // Draw animated spaceship
            this.ctx.rotate(Math.sin(time) * 0.2);
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(25, 0);
            this.ctx.lineTo(-15, -12);
            this.ctx.lineTo(-10, 0);
            this.ctx.lineTo(-15, 12);
            this.ctx.lineTo(25, 0);
            this.ctx.stroke();

            // Engine flames when hovered
            if (isHovered) {
                this.ctx.beginPath();
                const flameLength = 15 + Math.random() * 10;
                this.ctx.moveTo(-10, -2);
                this.ctx.lineTo(-10 - flameLength, 0);
                this.ctx.lineTo(-10, 2);
                this.ctx.strokeStyle = '#FF4400';
            this.ctx.stroke();
        }
        } else {
            // Draw animated stick figure
            const bounce = Math.sin(time * 2) * 5;
            this.ctx.translate(0, bounce);
            this.drawStickFigurePreview(isHovered);
        }
        this.ctx.restore();

        // Title text
        this.ctx.fillStyle = '#00FF00';
        this.ctx.font = isHovered ? 'bold 28px Arial' : 'bold 24px Arial';
        this.ctx.fillText(title, x + width/2, y + height + 30);

        // Subtitle
        this.ctx.font = isHovered ? '20px Arial' : '18px Arial';
        this.ctx.fillText(subtitle, x + width/2, y + height + 60);
    }

    drawStickFigurePreview(isHovered) {
        const time = Date.now() * 0.002;
        const armAngle = isHovered ? Math.sin(time * 3) * 0.5 : 0;
        
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 3;

        // Head
        this.ctx.beginPath();
        this.ctx.arc(0, -30, 10, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Body
        this.ctx.beginPath();
        this.ctx.moveTo(0, -20);
        this.ctx.lineTo(0, 20);
        this.ctx.stroke();

        // Arms with animation
        this.ctx.beginPath();
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(-15 * Math.cos(armAngle), Math.sin(armAngle) * 15);
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(15 * Math.cos(-armAngle), Math.sin(-armAngle) * 15);
        this.ctx.stroke();
        
        // Legs
        this.ctx.beginPath();
        this.ctx.moveTo(0, 20);
        this.ctx.lineTo(-15, 45);
        this.ctx.moveTo(0, 20);
        this.ctx.lineTo(15, 45);
        this.ctx.stroke();
    }

    drawDeathScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('YOU DIED', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Draw kill count
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Kills: ${this.gameState.killCount}`, this.canvas.width / 2, this.canvas.height / 2);
        
        // Draw retry button
        const retryButtonWidth = 200;
        const retryButtonHeight = 50;
        const retryButtonX = this.canvas.width / 2 - retryButtonWidth / 2;
        const retryButtonY = this.canvas.height / 2 + 50;
        
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(retryButtonX, retryButtonY, retryButtonWidth, retryButtonHeight);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('RETRY', this.canvas.width / 2, retryButtonY + retryButtonHeight / 2 + 8);
        
        // Draw quit button
        const quitButtonWidth = 200;
        const quitButtonHeight = 50;
        const quitButtonX = this.canvas.width / 2 - quitButtonWidth / 2;
        const quitButtonY = this.canvas.height / 2 + 120;
        
        this.ctx.fillStyle = '#F44336';
        this.ctx.fillRect(quitButtonX, quitButtonY, quitButtonWidth, quitButtonHeight);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('QUIT', this.canvas.width / 2, quitButtonY + quitButtonHeight / 2 + 8);
        
        // Store button coordinates for click handling
        this.retryButton = {
            x: retryButtonX,
            y: retryButtonY,
            width: retryButtonWidth,
            height: retryButtonHeight
        };
        
        this.quitButton = {
            x: quitButtonX,
            y: quitButtonY,
            width: quitButtonWidth,
            height: quitButtonHeight
        };
        
        // Draw crosshair on death screen
        this.drawCrosshair();
    }

    drawVictoryScreen() {
        // Victory overlay with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(0, 100, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 50, 0, 0.9)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Victory text
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('VICTORY!', this.canvas.width / 2, this.canvas.height / 2 - 50);

        // Stats with golden color
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Distance: ${this.gameState.distance}m`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText(`Total Kills: ${this.gameState.killCount}`, this.canvas.width / 2, this.canvas.height / 2 + 50);

        // Draw play again button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height / 2 + 100;

        // Button background
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Button text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('PLAY AGAIN', this.canvas.width / 2, buttonY + buttonHeight / 2);

        // Store button coordinates for click handling
        this.retryButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    }

    gameLoop() {
        if (this.gameStarted) {
        this.update();
        }
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    spawnEnemy() {
        // Calculate spawn position with more randomization
        const minSpawnDistance = 800;  // Minimum distance from player
        const maxSpawnDistance = 2000; // Maximum distance from player
        const spawnDistance = minSpawnDistance + Math.random() * (maxSpawnDistance - minSpawnDistance);
        const spawnDirection = Math.random() < 0.5 ? -1 : 1; // Left or right
        
        // Calculate base spawn position
        let spawnX = this.player.x + (spawnDirection * spawnDistance);
        
        // Add some random offset to create clusters
        spawnX += (Math.random() - 0.5) * 400; // ±200 pixels from base position
        
        // Keep spawn within world bounds
        spawnX = Math.max(0, Math.min(spawnX, this.worldWidth));
        
        // Get ground height at spawn position
        const groundHeight = this.getGroundHeight(spawnX);
        
        // Add some height variation for spawning
        const heightVariation = Math.random() * 100; // Spawn up to 100 pixels above ground
        
        const enemy = {
            x: spawnX,
            y: groundHeight - 50 - heightVariation, // Base height + random elevation
            width: 30,
            height: 50,
            speedX: 0,
            speedY: 0,
            maxSpeed: 3,
            health: 100,
            seekDistance: 800,
            shootInterval: 1000 + Math.random() * 1000, // 1-2 seconds
            lastShot: 0,
            canShoot: true,
            shootAccuracy: this.waveSystem.baseEnemyAccuracy + 
                          (this.waveSystem.currentWave - 1) * this.waveSystem.enemyAccuracyIncrement,
            color: '#FF0000',
            isDying: false,
            deathTimer: 0,
            ammo: 5 // Each enemy drops 5 ammo
        };
        
        this.enemies.push(enemy);
        this.waveSystem.enemiesSpawned++;
    }

    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            // Only remove enemies that are extremely far away
            if (enemy.x < this.viewportX - 5000 || enemy.x > this.viewportX + this.canvas.width + 5000) return false;

            // Calculate direction to player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // More aggressive movement toward player
            if (distanceToPlayer > 300) {
                // Move towards player with more consistent speed
                const moveSpeed = 2.0 + (Math.random() * 0.5); // 2.0-2.5 speed
                enemy.speedX = Math.sign(dx) * moveSpeed;
                
                // Occasional jump if needed to get over terrain
                if (enemy.canJump && Math.random() < 0.02) {
                    enemy.speedY = -10; // Jump force
                    enemy.canJump = false;
                }
            } else {
                // At closer range, strafe and maintain tactical distance
                enemy.speedX = (Math.random() < 0.7 ? Math.sign(dx) : -Math.sign(dx)) * (1.5 + Math.random());
            }

            // Apply movement with limits
            enemy.x += enemy.speedX;
            enemy.y += enemy.speedY;
            enemy.speedY += 0.5; // Gravity

            // Check ground collision
            const groundHeight = this.getGroundHeight(enemy.x);
            if (enemy.y >= groundHeight - enemy.height) {
                enemy.y = groundHeight - enemy.height;
                enemy.speedY = 0;
                enemy.canJump = true;
            }

            // Shoot at player with improved rate based on distance
            const shootChance = distanceToPlayer < 600 ? 0.03 : 0.01; // More shooting when closer
            if (Math.random() < shootChance && Date.now() - enemy.lastShot > enemy.shootInterval) {
                this.enemyShoot(enemy);
                enemy.lastShot = Date.now();
            }

            return true;
        });
    }

    enemyShoot(enemy) {
        const currentTime = Date.now();
        
        // Check if enemy can shoot and enough time has passed since last shot
        if (enemy.canShoot && currentTime - enemy.lastShot >= enemy.shootInterval) {
            // Calculate direction to player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only shoot if within range
            if (distance < 1200) {
                // Calculate base angle to player
                const baseAngle = Math.atan2(dy, dx);
                
                // Apply accuracy (lower value = more accurate)
                // The higher the wave, the more accurate the enemies
                const accuracyVariance = (1 - enemy.shootAccuracy) * Math.PI;
                const spreadAngle = baseAngle + (Math.random() - 0.5) * accuracyVariance;
                
                // Create bullet
            this.enemyBullets.push({
                x: enemy.x,
                y: enemy.y,
                    speedX: Math.cos(spreadAngle) * 10,
                    speedY: Math.sin(spreadAngle) * 10,
                    width: 5,
                    height: 5,
                    lifetime: this.laserLifetime // Initialize lifetime
                });
                
                // Play sound
                this.audio.play('enemyShoot');
                
                // Reset lastShot time
                enemy.lastShot = currentTime;
            }
        }
    }

    updateEnemyBullets() {
        // Move bullets and check for collisions
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            // Add lifetime property if it doesn't exist
            if (bullet.lifetime === undefined) {
                bullet.lifetime = this.laserLifetime;
            }
            
            // Decrement lifetime and remove if expired
            bullet.lifetime--;
            if (bullet.lifetime <= 0) {
                return false;
            }
            
            // Move the bullet
            bullet.x += bullet.speedX;
            bullet.y += bullet.speedY;
            
            // Check collision with terrain
            const groundHeight = this.getGroundHeight(bullet.x);
            if (bullet.y + bullet.height > groundHeight) {
                return false;
            }
            
            // Check collision with player
            if (this.checkCollision(bullet, {
                x: this.player.x - this.player.width/2,
                y: this.player.y - this.player.height/2,
                width: this.player.width,
                height: this.player.height
            })) {
                // Damage the player
                this.player.health -= 10;
                this.audio.play('hit');
                
                // Create hit effect
                for (let i = 0; i < 5; i++) {
                    this.particles.push({
                        x: bullet.x,
                        y: bullet.y,
                        dx: (Math.random() - 0.5) * 2,
                        dy: (Math.random() - 0.5) * 2,
                        life: 20,
                        color: '#FF0000',
                        size: 2
                    });
                }
                return false;
            }

            // Check if bullet is out of bounds
            if (bullet.x < 0 || bullet.x > this.worldWidth || 
                bullet.y < 0 || bullet.y > this.canvas.height) {
                return false;
            }
            
            return true;
        });
    }

    checkCollision(rect1, rect2) {
        // For enemies, use center-based coordinates
        let r1x = rect1.x;
        let r1y = rect1.y;
        let r2x = rect2.x;
        let r2y = rect2.y;

        // If it's an enemy, adjust for center-based coordinates
        if (rect1.width === 30) { // Enemy width
            r1x -= rect1.width / 2;
            r1y -= rect1.height / 2;
        }
        
        return r1x < r2x + rect2.width &&
               r1x + rect1.width > r2x &&
               r1y < r2y + rect2.height &&
               r1y + rect1.height > r2y;
    }

    restartGame() {
        // Reset game state flags
        this.gameStarted = false;
        this.showCharacterSelect = false;
        this.isSpaceship = true;
        
        // Reset viewport and world
        this.viewportX = 0;
        this.worldWidth = 6000;
        
        // Get initial ground height for player spawn
        const initialGroundHeight = this.canvas.height * 0.6;
        
        // Reset player to initial state
        this.player = {
            x: 100,
            y: initialGroundHeight - 40,
            width: 40,
            height: 24,
            health: 100,
            maxHealth: 100,
            speedX: 0,
            speedY: 0,
            maxSpeedX: 8,
            acceleration: 0.5,    // Reduced for smoother acceleration
            friction: 0.92,      // Adjusted for smoother deceleration
            gravity: 0.5,        // Reduced for smoother vertical movement
            jumpForce: -10,      // Adjusted for smoother jumps
            canJump: true,
            doubleJump: true,
            isSliding: false,
            rotation: 0,
            gunAngle: 0,
            forcedSlide: false,
            canFly: true,
            flyingSpeed: -5,     // Reduced for smoother flying
            descendSpeed: 2.5,   // Reduced for smoother descent
            isDead: false,
            capeAnimation: 0,
            flyingAcceleration: 0.3, // Reduced for smoother flying acceleration
            maxFlySpeed: 10,
            currentFlySpeed: 0,
            maxAmmo: 200,
            ammo: 200,
            isFullAuto: true,
            currentWeapon: 'rifle',
            isZoomed: false,
            isDashing: false,
            dashCooldown: 0,
            dashDuration: 15,
            dashSpeed: 90,
            lastWKeyState: false,
            // Add smoothing properties
            targetX: 100,
            targetY: initialGroundHeight - 40,
            smoothingFactor: 0.2 // How quickly to move toward target position
        };

        // Reset game state
        this.gameState = {
            distance: 0,
            winDistance: 15000,
            gameWon: false,
            killCount: 0,
            requiredKills: 100,
            currentWave: 1,
            maxEnemies: 2000
        };

        // Clear all arrays
        this.enemies = [];
        this.deadEnemies = [];
        this.enemyBullets = [];
        this.lasers = [];
        this.particles = [];
        this.bloodParticles = [];
        this.grenades = [];
        this.walls = [];

        // Reset timers and counters
        this.spawnEnemyTimer = 0;
        this.lastShotTime = 0;
        this.specialLaserCooldown = 0;
        this.specialLaserDuration = 0;
        this.specialLaser = null;
        this.nukeReady = true;
        this.nukeCooldown = 0;
        this.isNukeAnimationActive = false;

        // Reset terrain
        this.terrainDamage.clear();
        this.generateTerrain();

        // Reset input states
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            e: false,
            '9': false,
            q: false,
            '8': false
        };
        this.mouseDown = false;
        this.isChargingGrenade = false;

        // Reset camera
        this.cameraZoom = 1.0;

        // Reset wave system
        this.waveSystem = {
            currentWave: 1,
            enemiesPerWave: 20,
            enemiesSpawned: 0,
            breakTimer: 0,
            initialBreakDuration: 900, // 15 seconds at 60fps
            breakDuration: 900, // Reset to initial duration
            isBreak: false,
            baseEnemyAccuracy: 0.1,
            enemyAccuracyIncrement: 0.05,
            waveKills: 0
        };
        
        // Reset laser properties
        this.spinningLasers = null;
        this.spinningLaserAngle = 0;
        this.spinningLaserDuration = 0;
        this.spinningLaserCooldown = 0;
        this.spinningLaserUsed = false; // Reset the one-time use flag
        // Reset shop state
        this.shop.isOpen = false;
        this.shop.canOpen = false;
        this.shop.timeRemaining = 0;
        Object.values(this.shop.items).forEach(item => item.purchased = false);
        this.coins = 0;

        // Reset landmines
        this.landmines = [];
    }

    createBloodEffect(x, y) {
        for (let i = 0; i < this.maxBloodParticles; i++) {
            const angle = (Math.PI * 2 * i) / this.maxBloodParticles;
            const speed = 2 + Math.random() * 3;
            this.bloodParticles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed + 2, // Add rightward drift
                dy: Math.sin(angle) * speed,
                life: this.bloodParticleLifespan,
                size: 2 + Math.random() * 2
            });
        }
    }

    updateBloodParticles() {
        this.bloodParticles = this.bloodParticles.filter(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.dy += 0.1; // Light gravity
            particle.life--;
            return particle.life > 0;
        });
    }

    drawBloodParticles() {
        this.ctx.fillStyle = '#ff0000';
        for (const particle of this.bloodParticles) {
            const screenX = particle.x - this.viewportX;
            const alpha = particle.life / this.bloodParticleLifespan;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(screenX, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    // Update line-box intersection to use center-based coordinates
    lineIntersectsBox(x1, y1, x2, y2, boxX, boxY, boxWidth, boxHeight) {
        // Adjust box coordinates to be center-based for enemies
        const adjustedBoxX = boxX - boxWidth / 2;
        const adjustedBoxY = boxY - boxHeight / 2;

        // Check if either end of the line is inside the box
        if (this.pointInBox(x1, y1, adjustedBoxX, adjustedBoxY, boxWidth, boxHeight) ||
            this.pointInBox(x2, y2, adjustedBoxX, adjustedBoxY, boxWidth, boxHeight)) {
            return true;
        }

        // Check each line of the box
        const lines = [
            [adjustedBoxX, adjustedBoxY, adjustedBoxX + boxWidth, adjustedBoxY], // top
            [adjustedBoxX + boxWidth, adjustedBoxY, adjustedBoxX + boxWidth, adjustedBoxY + boxHeight], // right
            [adjustedBoxX + boxWidth, adjustedBoxY + boxHeight, adjustedBoxX, adjustedBoxY + boxHeight], // bottom
            [adjustedBoxX, adjustedBoxY + boxHeight, adjustedBoxX, adjustedBoxY] // left
        ];

        for (const [x3, y3, x4, y4] of lines) {
            if (this.lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4)) {
                return true;
            }
        }

        return false;
    }

    pointInBox(x, y, boxX, boxY, boxWidth, boxHeight) {
        return x >= boxX && x <= boxX + boxWidth &&
               y >= boxY && y <= boxY + boxHeight;
    }

    lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denominator === 0) return false;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    throwChargedGrenade() {
        // Calculate throw direction based on cursor position
        const dx = this.cursor.x - (this.player.x - this.viewportX);
        const dy = this.cursor.y - this.player.y;
        const angle = Math.atan2(dy, dx);
        
        // Calculate initial position slightly in front of player
        const offsetX = Math.cos(angle) * 20;
        const offsetY = Math.sin(angle) * 20;
        
        // Create and throw the grenade
        this.grenades.push({
            x: this.player.x + offsetX,
            y: this.player.y + offsetY,
            speedX: Math.cos(angle) * this.grenadeThrowPower,
            speedY: Math.sin(angle) * this.grenadeThrowPower - 5, // Add slight upward boost
            exploded: false,
            isCharged: this.isChargingGrenade
        });
        
        // Play throw sound
        this.audio.play('shoot');
    }

    createGrenadeExplosion(x, y, isCharged = false) {
        this.audio.play('explosion');
        // Create explosion particles with greatly reduced count
        const particleCount = isCharged ? 8 : 3; // Reduced from 15/5 to 8/3
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = isCharged ? (0.5 + Math.random()) : (0.2 + Math.random() * 0.5); // Reduced speeds
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 0.5,
                life: isCharged ? 20 : 10, // Reduced particle life
                color: isCharged ? '#FF4400' : '#FF8800',
                size: isCharged ? (1 + Math.random()) : (0.5 + Math.random() * 0.5) // Reduced sizes
            });
        }

        // Calculate blast radius - reduced by 90%
        const blastRadius = isCharged ? 15 : 7; // Reduced from 45/22 to 15/7

        // Check for enemies in blast radius with reduced damage
        this.enemies = this.enemies.filter(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= blastRadius) {
                enemy.isDying = true;
                enemy.deathTimer = 0;
                enemy.speedY = -1; // Reduced upward force
                enemy.color = '#000000';
                enemy.canShoot = false;
                this.deadEnemies.push(enemy);
                this.createBloodEffect(enemy.x, enemy.y);
                this.audio.play('enemyDeath');
                this.gameState.killCount++;
                this.waveSystem.waveKills++; // Add wave kill tracking
                return false;
            }
            return true;
        });

        // Create smoother hole in terrain with reduced impact
        const multiplier = isCharged ? 0.5 : 0.2;
        const baseHoleWidth = isCharged ? (this.canvas.width / 48) : (this.canvas.width / 96); // Wider, smoother holes
        const holeWidth = baseHoleWidth * (this.worldWidth / this.canvas.width);
        const holeDepth = 2 * multiplier; // Shallow depth for smoother appearance
        
        // Calculate base minimum height (indestructible layer)
        const baseMinHeight = this.canvas.height * (8/9); // Bottom 1/9 is indestructible
        
        // Use a consistent slope direction for smoother appearance
        const slopeDirection = 0; // No slope for smoother holes
        const slopeIntensity = 0.1; // Very minimal slope intensity
        
        // First pass: calculate new heights
        const newHeights = [];
        
        for (let i = 0; i < this.terrain.length; i++) {
            const point = this.terrain[i];
            const dx = point.x - x;
            
            if (Math.abs(dx) < holeWidth) {
                // Use a smooth curve function (cosine) for crater shape
                const normalizedDist = (dx / holeWidth);
                // Cosine curve creates a smooth, rounded crater
                const deformation = holeDepth * (Math.cos(normalizedDist * Math.PI) + 1) / 2;
                
                const currentHeight = this.terrainDamage.get(Math.floor(point.x)) || point.originalY;
                let newHeight = currentHeight + deformation;
                
                // Ensure we don't go below the minimum height
                newHeight = Math.max(newHeight, baseMinHeight);
                
                newHeights[i] = newHeight;
            } else {
                newHeights[i] = this.terrainDamage.get(Math.floor(point.x)) || point.originalY;
            }
        }
        
        // Second pass: apply smoothing
        for (let i = 0; i < this.terrain.length; i++) {
            const point = this.terrain[i];
            const dx = point.x - x;
            
            if (Math.abs(dx) < holeWidth * 1.2) { // Slightly wider area for smoothing
                // Apply smoothing by averaging with neighbors
                let smoothedHeight = newHeights[i];
                
                // Average with neighbors for smoothness
                let neighborCount = 1; // Start with self
                let neighborSum = smoothedHeight;
                
                // Check left neighbors
                for (let j = 1; j <= 2; j++) {
                    if (i - j >= 0) {
                        neighborCount++;
                        neighborSum += newHeights[i - j];
                    }
                }
                
                // Check right neighbors
                for (let j = 1; j <= 2; j++) {
                    if (i + j < this.terrain.length) {
                        neighborCount++;
                        neighborSum += newHeights[i + j];
                    }
                }
                
                // Calculate smoothed height
                smoothedHeight = neighborSum / neighborCount;
                
                // Apply the smoothed height
                const key = Math.floor(point.x);
                this.terrainDamage.set(key, smoothedHeight);
                point.y = smoothedHeight;
            }
        }
    }

    createWoodWall() {
        // Calculate position in front of player based on gun angle
        const wallX = this.player.x + Math.cos(this.player.gunAngle) * this.wallDistance;
        const wallY = this.player.y + Math.sin(this.player.gunAngle) * this.wallDistance;
        
        this.walls.push({
            x: wallX,
            y: wallY - this.wallHeight/2, // Adjust Y to account for wall height
            width: this.wallWidth,
            height: this.wallHeight,
            health: this.wallHealth,
            rotation: Math.PI/2 // Fixed 90-degree rotation
        });
    }

    checkWallCollisions(entity) {
        for (const wall of this.walls) {
            const entityCenterX = entity.x + entity.width/2;
            const entityCenterY = entity.y + entity.height/2;
            
            // Check if entity is within wall bounds
            if (entityCenterX > wall.x - wall.width/2 &&
                entityCenterX < wall.x + wall.width/2 &&
                entityCenterY > wall.y &&
                entityCenterY < wall.y + wall.height) {
                return true;
            }
        }
        return false;
    }

    // Add new method for nuke
    dropNuke() {
        this.audio.play('nuke');
        // Create massive explosion effect
        const centerX = this.player.x;
        const centerY = this.player.y;
        
        // Create explosion particles
        for (let i = 0; i < 200; i++) {
            const angle = (Math.PI * 2 * i) / 200;
            const speed = 10 + Math.random() * 15;
            const size = 5 + Math.random() * 10;
            this.particles.push({
                x: centerX,
                y: centerY,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 5,
                life: 120,
                color: ['#FF0000', '#FF4400', '#FF8800', '#FFAA00'][Math.floor(Math.random() * 4)],
                size: size
            });
        }
        
        // Flatten terrain in view
        const viewStart = Math.max(0, Math.floor((this.viewportX - this.canvas.width) / (this.worldWidth / this.terrain.length)));
        const viewEnd = Math.min(this.terrain.length, Math.ceil((this.viewportX + this.canvas.width * 2) / (this.worldWidth / this.terrain.length)));
        
        // Flatten the terrain
        for (let i = viewStart; i < viewEnd; i++) {
            this.terrain[i].y = this.canvas.height * 0.9;
            this.terrainDamage.set(Math.floor(this.terrain[i].x), this.terrain[i].y);
        }
        
        // Kill all enemies in view
        this.enemies.forEach(enemy => {
            if (enemy.x >= this.viewportX - this.canvas.width && 
                enemy.x <= this.viewportX + this.canvas.width * 2) {
                enemy.isDying = true;
                enemy.deathTimer = 0;
                enemy.speedY = -10;
                enemy.color = '#000000';
                enemy.canShoot = false;
                this.deadEnemies.push(enemy);
                this.createBloodEffect(enemy.x, enemy.y);
            }
        });
        this.enemies = this.enemies.filter(enemy => !enemy.isDying);
        
        // Clear all walls in view
        this.walls = this.walls.filter(wall => 
            wall.x < this.viewportX - this.canvas.width || 
            wall.x > this.viewportX + this.canvas.width * 2
        );
        
        // Set cooldown
        this.nukeReady = false;
        this.nukeCooldown = 30 * 60; // 30 seconds at 60 FPS
    }

    createSpriteToggleButton() {
        const button = document.createElement('button');
        button.textContent = 'Switch to Stick Figure';
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.padding = '10px';
        button.style.backgroundColor = '#4488ff';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '1000';
        
        button.addEventListener('click', () => {
            this.isSpaceship = !this.isSpaceship;
            button.textContent = this.isSpaceship ? 'Switch to Stick Figure' : 'Switch to Spaceship';
        });
        
        document.body.appendChild(button);
    }

    startLevel2() {
        this.gameState.currentWave = 2;
        this.gameState.maxEnemies = 20; // Keep consistent max enemies in level 2
        this.maxEnemies = this.gameState.maxEnemies;
        // Reset enemy spawn timer to immediately start spawning new enemies
        this.spawnEnemyTimer = this.enemySpawnInterval;
    }

    createSpecialLaser() {
        this.audio.play('shoot');
        this.specialLaser = {
            x: this.player.x,
            y: this.player.y,
            angle: this.player.gunAngle
        };
        this.specialLaserDuration = 5 * 60; // Changed to 5 seconds at 60fps
    }

    startNukeCountdown() {
        // Start the countdown animation
        this.isNukeAnimationActive = true;
        this.nukeCountdown = 5;
        this.nukeAnimationFrame = 0;
        this.nukeFlashIntensity = 0;
        
        // Play initial warning sound
        this.audio.play('reload');
    }

    updateNukeAnimation() {
        if (!this.isNukeAnimationActive) return;

        this.nukeAnimationFrame++;
        
        // Update countdown every 60 frames (1 second)
        const currentNumber = 5 - Math.floor(this.nukeAnimationFrame / 60);
        if (currentNumber !== this.lastCountdownNumber) {
            this.lastCountdownNumber = currentNumber;
            this.audio.play('weaponSwitch');
            // Increase flash speed as countdown progresses
            this.flashSpeed = 0.2 + (5 - currentNumber) * 0.1;
        }

        // More dramatic flashing effect that intensifies
        this.nukeFlashIntensity = Math.abs(Math.sin(this.nukeAnimationFrame * this.flashSpeed)) * 0.8;
        
        // When countdown reaches 0, trigger the actual nuke
        if (currentNumber < 0) {
            this.isNukeAnimationActive = false;
            this.executeNuke();
        }
    }

    executeNuke() {
        this.audio.play('nuke');
        // Create massive explosion effect
        const centerX = this.player.x;
        const centerY = this.player.y;
        
        // Create explosion particles
        for (let i = 0; i < 200; i++) {
            const angle = (Math.PI * 2 * i) / 200;
            const speed = 10 + Math.random() * 15;
            const size = 5 + Math.random() * 10;
            this.particles.push({
                x: centerX,
                y: centerY,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 5,
                life: 120,
                color: ['#FF0000', '#FF4400', '#FF8800', '#FFAA00'][Math.floor(Math.random() * 4)],
                size: size
            });
        }
        
        // Flatten terrain in view
        const viewStart = Math.max(0, Math.floor((this.viewportX - this.canvas.width) / (this.worldWidth / this.terrain.length)));
        const viewEnd = Math.min(this.terrain.length, Math.ceil((this.viewportX + this.canvas.width * 2) / (this.worldWidth / this.terrain.length)));
        
        // Flatten the terrain
        for (let i = viewStart; i < viewEnd; i++) {
            this.terrain[i].y = this.canvas.height * 0.9;
            this.terrainDamage.set(Math.floor(this.terrain[i].x), this.terrain[i].y);
        }
        
        // Kill all enemies in view
        this.enemies.forEach(enemy => {
            if (enemy.x >= this.viewportX - this.canvas.width && 
                enemy.x <= this.viewportX + this.canvas.width * 2) {
                enemy.isDying = true;
                enemy.deathTimer = 0;
                enemy.speedY = -10;
                enemy.color = '#000000';
                enemy.canShoot = false;
                this.deadEnemies.push(enemy);
                this.createBloodEffect(enemy.x, enemy.y);
                this.gameState.killCount++; // Add this to track kills
                this.waveSystem.waveKills++; // Add this to track wave kills
            }
        });
        this.enemies = this.enemies.filter(enemy => !enemy.isDying);
        
        // Clear all walls in view
        this.walls = this.walls.filter(wall => 
            wall.x < this.viewportX - this.canvas.width || 
            wall.x > this.viewportX + this.canvas.width * 2
        );
        
        // Set cooldown
        this.nukeReady = false;
        this.nukeCooldown = 30 * 60; // 30 seconds at 60 FPS
    }

    drawNukeAnimation() {
        if (!this.isNukeAnimationActive) return;

        // Draw red overlay with more intense flashing
        this.ctx.fillStyle = `rgba(255, 0, 0, ${this.nukeFlashIntensity})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw countdown number with shadow for better visibility
        if (this.lastCountdownNumber > 0) {
            this.ctx.save();
            
            // Add shadow
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowOffsetX = 4;
            this.ctx.shadowOffsetY = 4;

            // Draw main number
            this.ctx.fillStyle = '#FF0000';
            this.ctx.font = 'bold 200px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.lastCountdownNumber.toString(), this.canvas.width / 2, this.canvas.height / 2);

            // Add warning text
            this.ctx.font = 'bold 40px Arial';
            this.ctx.fillText('NUCLEAR STRIKE IMMINENT', this.canvas.width / 2, this.canvas.height / 2 - 150);

            this.ctx.restore();
        }
    }

    createSpinningLasers() {
        if (this.spinningLaserCooldown > 0 || this.spinningLasers || this.spinningLaserUsed) return;
        
        this.audio.play('shoot');
        this.spinningLasers = Array(8).fill().map((_, i) => ({
            x: this.player.x,
            y: this.player.y,
            angle: (Math.PI * 2 * i) / 8
        }));
        this.spinningLaserDuration = 5 * 60; // 5 seconds at 60fps
        this.spinningLaserCooldown = this.spinningLaserCooldownTime;
        this.spinningLaserUsed = true; // Mark as used
    }

    startHealing() {
        if (this.player.health >= this.player.maxHealth) return;
        
        this.isHealing = true;
        this.healingProgress = 0;
        this.audio.play('collect'); // Use collect sound for healing
    }

    createLandmineExplosion(x, y) {
        this.audio.play('explosion');
        
        // Create explosion particles
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 60,
                color: '#FF4400',
                size: 3 + Math.random() * 3
            });
        }

        const radius = this.weapons.landmine.explosionRadius;

        // Check for player in blast radius
        const dx = this.player.x - x;
        const dy = this.player.y - y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        if (distanceToPlayer <= radius) {
            this.player.isDead = true;
        }

        // Check for enemies in blast radius
        this.enemies = this.enemies.filter(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                enemy.isDying = true;
                enemy.deathTimer = 0;
                enemy.speedY = -5;
                enemy.color = '#000000';
                enemy.canShoot = false;
                this.deadEnemies.push(enemy);
                this.createBloodEffect(enemy.x, enemy.y);
                this.audio.play('enemyDeath');
                this.gameState.killCount++;
                this.waveSystem.waveKills++;
                this.coins++;
                return false;
            }
            return true;
        });

        // Create terrain deformation
        this.deformTerrain(x, y, radius);
    }

    drawOtherPlayers() {
        if (!this.isMultiplayer) return;
        
        Object.values(otherPlayers).forEach(player => {
            const screenX = player.x - this.viewportX;
            
            // Skip if player is off screen
            if (screenX < -50 || screenX > this.canvas.width + 50) return;
            
            this.ctx.save();
            this.ctx.translate(screenX + player.width/2, player.y + player.height/2);
            
            // Draw stick figure
            this.ctx.strokeStyle = player.color || '#FF0000';
            this.ctx.lineWidth = 3;
            
            // Body
            const bodyLength = 20;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -bodyLength);
            this.ctx.lineTo(0, bodyLength/2);
            this.ctx.stroke();
            
            // Head
            this.ctx.beginPath();
            this.ctx.arc(0, -bodyLength - 10, 10, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Arms
            const armLength = 15;
            this.ctx.beginPath();
            this.ctx.moveTo(-armLength, -bodyLength + 5);
            this.ctx.lineTo(armLength, -bodyLength + 5);
            this.ctx.stroke();
            
            // Left arm (gun arm)
            const rightArmX = armLength;
            const rightArmY = -bodyLength + 5;
            
            // Legs
            const legLength = 20;
            this.ctx.beginPath();
            this.ctx.moveTo(0, bodyLength/2);
            this.ctx.lineTo(-10, legLength);
            this.ctx.moveTo(0, bodyLength/2);
            this.ctx.lineTo(10, legLength);
            this.ctx.stroke();
            
            // Draw gun
            this.ctx.beginPath();
            this.ctx.save();
            this.ctx.translate(rightArmX, rightArmY);
            this.ctx.rotate(player.gunAngle);
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(15, 0);
            this.ctx.stroke();
            this.ctx.restore();
            
            // Draw player ID or name above head
            this.ctx.fillStyle = player.color || '#FF0000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.id.substring(0, 6), 0, -bodyLength - 25);
            
            // Draw health bar
            const healthBarWidth = 40;
            const healthBarHeight = 5;
            const healthPercent = player.health / 100;
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(-healthBarWidth/2, -bodyLength - 35, healthBarWidth, healthBarHeight);
            
            this.ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
            this.ctx.fillRect(-healthBarWidth/2, -bodyLength - 35, healthBarWidth * healthPercent, healthBarHeight);
            
            this.ctx.restore();
        });
    }
}


// Start the game when the page loads
window.onload = () => {
    new Game();
}; 