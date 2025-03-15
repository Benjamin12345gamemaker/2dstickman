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
            weaponSwitch: new Audio('sounds/weapon_switch.mp3')
        };

        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
        });

        // Set specific volumes
        this.sounds.explosion.volume = 0.4;
        this.sounds.nuke.volume = 0.5;
        this.sounds.shoot.volume = 0.15;
        
        // Remove gun sound loop
        this.sounds.shoot.loop = false;
        this.lastFlySound = 0;
    }

    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            // For fly sound, prevent too frequent playback
            if (soundName === 'fly') {
                const now = Date.now();
                if (now - this.lastFlySound < 100) return; // Only play every 100ms
                this.lastFlySound = now;
            }
            
            // Create a new audio element for all sounds
            const clone = sound.cloneNode();
            clone.volume = sound.volume;
            clone.play().catch(e => console.log("Audio play failed:", e));
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
        
        // Add sprite toggle state
        this.isSpaceship = true;
        
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
            width: 40,  // Increased for ship
            height: 24, // Adjusted for ship
            speedX: 0,
            speedY: 0,
            maxSpeedX: 6,
            acceleration: 0.3,
            friction: 0.95, // Increased for smoother space movement
            gravity: 0.2,   // Reduced for space-like feel
            jumpForce: -45,
            canJump: true,
            doubleJump: false,
            isSliding: false,
            rotation: 0,
            gunAngle: 0,
            forcedSlide: false,
            canFly: true,  // Always true for spaceship
            flyingSpeed: -6,
            descendSpeed: 3,
            isDead: false,
            capeAnimation: 0,
            flyingAcceleration: 0.45,
            maxFlySpeed: 12,
            currentFlySpeed: 0,
            ammo: 100,     // More ammo for ship
            isFullAuto: true,
            currentWeapon: 'rifle',
            isZoomed: false,
            isDashing: false,
            dashCooldown: 0,
            dashDuration: 15,
            dashSpeed: 90
        };

        // Add weapon properties
        this.weapons = {
            rifle: {
                shootInterval: 100,
                bulletSpeed: 15,
                spread: 0
            },
            shotgun: {
                shootInterval: 500,
                bulletSpeed: 12,
                spread: 0.5,
                pellets: 15
            },
            sniper: {
                shootInterval: 1000,
                bulletSpeed: 25,
                spread: 0,
                zoomFactor: 2
            },
            launchGun: {
                shootInterval: 500,
                bulletSpeed: 20,
                spread: 0,
                launchForce: 40,  // Changed from 400 to 40 (80% of 50)
                color: '#4488ff'
            }
        };

        // Input handling
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            e: false
        };

        // Terrain destruction properties
        this.particles = [];
        this.deformationRadius = 300;
        this.maxParticles = 30;
        this.particleLifespan = 50;
        this.deformationStrength = 40;
        this.maxDeformationDepth = 2000;
        this.tunnelWidth = 200;

        // Laser properties
        this.lasers = [];
        this.laserSpeed = 15;
        this.laserPower = 20; // How much terrain is destroyed

        // Terrain properties
        this.terrain = [];
        this.terrainDamage = new Map(); // Store terrain deformation
        this.generateTerrain();
        
        // Game state
        this.gameState = {
            distance: 0,
            winDistance: 15000,
            gameWon: false
        };

        // Enemy properties
        this.enemies = [];
        this.deadEnemies = []; // Store dying enemies for animation
        this.enemyBullets = [];
        this.spawnEnemyTimer = 0;
        this.enemySpawnInterval = 120; // Spawn enemy every 120 frames
        this.maxEnemies = 5; // Maximum number of enemies at once
        
        // Add blood particle properties
        this.bloodParticles = [];
        this.maxBloodParticles = 20;
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
        this.wallWidth = 30;
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
            case 'shift': 
                if (event.location === 2) {
                    if (!this.player.isDashing && this.player.dashCooldown <= 0) {
                        this.audio.play('dash');
                        this.player.isDashing = true;
                        this.player.dashCooldown = 60;
                        const dashSpeed = 15;
                        this.player.speedX = Math.cos(this.player.gunAngle) * dashSpeed;
                        this.player.speedY = Math.sin(this.player.gunAngle) * dashSpeed;
                    }
                } else {
                    this.player.isFullAuto = !this.player.isFullAuto;
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
                this.createWoodWall();
                this.audio.play('wallPlace');
                break;
            case '5':
                if (this.nukeReady) {
                    this.dropNuke();
                    this.audio.play('nuke');
                }
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
        }
    }

    handleMouseMove(event) {
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

    handleMouseDown(event) {
        if (event.button === 0) { // Left click
            if (this.isChargingGrenade) {
                this.throwChargedGrenade();
            } else {
                this.mouseDown = true;
                if (!this.player.isFullAuto) { // Single shot in semi-auto
                    this.shoot();
                    this.mouseDown = false;
                }
            }
        } else if (event.button === 2 && this.player.currentWeapon === 'sniper') { // Right click for sniper zoom
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
        const weapon = this.weapons[this.player.currentWeapon];
        
        if (currentTime - this.lastShotTime >= this.shootInterval) {
            if (this.player.currentWeapon === 'launchGun') {
                this.audio.play('dash');
                // Calculate launch direction (opposite of aim)
                const launchAngle = this.player.gunAngle + Math.PI;
                
                // Apply launch force to player
                this.player.speedX = Math.cos(launchAngle) * weapon.launchForce;
                this.player.speedY = Math.sin(launchAngle) * weapon.launchForce;
                
                // Create projectile in shooting direction
                const laserDx = Math.cos(this.player.gunAngle);
                const laserDy = Math.sin(this.player.gunAngle);
                
                this.lasers.push({
                    x: this.player.x + 25 * laserDx,
                    y: this.player.y + 25 * laserDy,
                    dx: laserDx * weapon.bulletSpeed,
                    dy: laserDy * weapon.bulletSpeed,
                    color: weapon.color
                });
                
                // Create particle effect in launch direction
                for (let i = 0; i < 20; i++) {
                    const spread = (Math.random() - 0.5) * 0.5;
                    const speed = 3 + Math.random() * 4;
                    this.particles.push({
                        x: this.player.x,
                        y: this.player.y,
                        dx: Math.cos(launchAngle + spread) * speed,
                        dy: Math.sin(launchAngle + spread) * speed,
                        life: 20 + Math.random() * 10,
                        color: weapon.color,
                        size: 2 + Math.random() * 2
                    });
                }
            } else if (this.player.currentWeapon === 'shotgun') {
                if (this.player.ammo >= weapon.pellets) {
                    this.audio.play('shoot');
                    for (let i = 0; i < weapon.pellets; i++) {
                        const spread = (Math.random() - 0.5) * weapon.spread;
                        const angle = this.player.gunAngle + spread;
                        const laserDx = Math.cos(angle);
                        const laserDy = Math.sin(angle);
                        
                        this.lasers.push({
                            x: this.player.x + 25 * laserDx,
                            y: this.player.y + 25 * laserDy,
                            dx: laserDx * weapon.bulletSpeed,
                            dy: laserDy * weapon.bulletSpeed,
                            color: '#ff0000'  // Added color for lasers
                        });
                        this.player.ammo--;
                    }
                }
            } else if (this.player.ammo > 0) {
                this.audio.play('shoot');
                const laserDx = Math.cos(this.player.gunAngle);
                const laserDy = Math.sin(this.player.gunAngle);
                
                this.lasers.push({
                    x: this.player.x + 25 * laserDx,
                    y: this.player.y + 25 * laserDy,
                    dx: laserDx * weapon.bulletSpeed,
                    dy: laserDy * weapon.bulletSpeed,
                    color: '#ff0000'  // Added color for lasers
                });
                this.player.ammo--;
            }
            
            this.lastShotTime = currentTime;
        }
    }

    getGroundHeight(x) {
        for (let i = 0; i < this.terrain.length - 1; i++) {
            if (x >= this.terrain[i].x && x < this.terrain[i + 1].x) {
                const t = (x - this.terrain[i].x) / (this.terrain[i + 1].x - this.terrain[i].x);
                return this.terrain[i].y + t * (this.terrain[i + 1].y - this.terrain[i].y);
            }
        }
        return 300;
    }

    getTerrainAngle(x) {
        for (let i = 0; i < this.terrain.length - 1; i++) {
            if (x >= this.terrain[i].x && x < this.terrain[i + 1].x) {
                const dx = this.terrain[i + 1].x - this.terrain[i].x;
                const dy = this.terrain[i + 1].y - this.terrain[i].y;
                return Math.atan2(dy, dx);
            }
        }
        return 0;
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
        const tunnelHalfWidth = this.tunnelWidth / 2;
        
        // Find affected terrain points
        for (let i = 0; i < this.terrain.length; i++) {
            const point = this.terrain[i];
            const dx = point.x - worldX;
            
            // Create a rectangular tunnel effect centered on hit point
            if (Math.abs(dx) < tunnelHalfWidth) {
                // Get current deformation or use original height
                const currentHeight = this.terrainDamage.get(Math.floor(point.x)) || point.originalY;
                
                // Calculate how much to dig based on distance from laser hit point
                const distanceFromHit = Math.abs(y - currentHeight);
                const verticalOffset = distanceFromHit < 40 ? 40 : 20; // Dig more at hit point
                
                // Add new deformation, allowing for upward digging
                const newHeight = currentHeight + verticalOffset;
                
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

        // Check if player hits bottom of screen
        if (this.player.y > this.canvas.height) {
            this.player.isDead = true;
        }

        if (this.player.isDead) {
            this.audio.play('death');
            this.restartGame();
            return;
        }

        // Update enemies and their bullets
        this.updateEnemies();
        this.updateEnemyBullets();

        // Spawn new enemies
        this.spawnEnemyTimer++;
        if (this.spawnEnemyTimer >= this.enemySpawnInterval) {
            this.spawnEnemyTimer = 0;
            if (this.enemies.length < this.maxEnemies) {
                this.spawnEnemy();
            }
        }

        // Handle rapid fire
        if (this.mouseDown) {
            this.shoot();
        }

        // Update lasers and check for terrain collision
        this.lasers = this.lasers.filter(laser => {
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
                    this.player.ammo += enemy.ammo; // Add enemy's ammo to player
                    this.deadEnemies.push(enemy);
                    this.enemies.splice(i, 1);
                    this.createBloodEffect(enemy.x, enemy.y);
                    this.audio.play('enemyDeath');
                    return false;
                }
            }

            laser.x += laser.dx;
            laser.y += laser.dy;
            
            const terrainY = this.getGroundHeight(laser.x);
            if (laser.y >= terrainY) {
                this.createExplosion(laser.x, laser.y);
                this.deformTerrain(laser.x, laser.y, this.deformationRadius);
                return false;
            }
            
            // Keep laser if it's within a reasonable range of the player
            return Math.abs(laser.x - this.player.x) < 10000;
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

        // Handle movement with improved space-like physics
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
            this.player.speedX *= this.player.friction;
            this.player.speedY *= this.player.friction;

            // Cap speed at 45 for both directions
            const currentSpeed = Math.sqrt(this.player.speedX * this.player.speedX + this.player.speedY * this.player.speedY);
            if (currentSpeed > 45) {
                const angle = Math.atan2(this.player.speedY, this.player.speedX);
                this.player.speedX = Math.cos(angle) * 45;
                this.player.speedY = Math.sin(angle) * 45;
            }
        } else {
            // Stick figure movement - affected by gravity
            if (this.keys.d) {
                this.player.speedX += this.player.currentWeapon === 'launchGun' ? this.player.acceleration * 2 : this.player.acceleration * 1.5;
            }
            if (this.keys.a) {
                this.player.speedX -= this.player.currentWeapon === 'launchGun' ? this.player.acceleration * 2 : this.player.acceleration * 1.5;
            }
            
            // Apply gravity (reduced for launch gun)
            this.player.speedY += this.player.currentWeapon === 'launchGun' ? 0.2 : 0.5;
            
            // Cap falling speed
            if (this.player.speedY > 20) {
                this.player.speedY = 20;
            }
            
            // Cap horizontal speed (higher for launch gun)
            const maxSpeed = this.player.currentWeapon === 'launchGun' ? 45 : 35;
            this.player.speedX = Math.min(maxSpeed, Math.max(-maxSpeed, this.player.speedX));
            
            // Apply horizontal friction (reduced for launch gun)
            this.player.speedX *= this.player.currentWeapon === 'launchGun' ? 0.99 : 0.9;
            
            // Check if on ground
            const groundHeight = this.getGroundHeight(this.player.x);
            if (this.player.y >= groundHeight - this.player.height) {
                this.player.y = groundHeight - this.player.height;
                this.player.speedY = 0;
                this.player.canJump = true;
            }
            
            // Handle jumping (only when on ground)
            if (this.keys.w && this.player.canJump) {
                this.player.speedY = this.player.currentWeapon === 'launchGun' ? -18 : -15;
                this.player.canJump = false;
                this.audio.play('jump');
            }
        }

        // Update player position
        const newX = this.player.x + this.player.speedX;
        const newY = this.player.y + this.player.speedY;
        
        // Create temporary player object with new position
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
        
        // Update viewport to allow free movement
        const minViewportX = this.player.x - this.canvas.width + 100; // Keep at least 100px margin
        const maxViewportX = this.player.x - 100; // Keep at least 100px margin
        const targetViewportX = Math.min(maxViewportX, Math.max(minViewportX, this.viewportX));
        
        // Smooth viewport movement
        this.viewportX += (targetViewportX - this.viewportX) * 0.1;

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
            // Use gun angle for dash direction
            const dashX = Math.cos(this.player.gunAngle) * this.player.dashSpeed;
            const dashY = Math.sin(this.player.gunAngle) * this.player.dashSpeed;
            
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
        this.ctx.lineWidth = 3;
        
        for (const laser of this.lasers) {
            const screenX = laser.x - this.viewportX;
            
            this.ctx.strokeStyle = laser.color || '#ff0000';
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, laser.y);
            this.ctx.lineTo(screenX - laser.dx * 2, laser.y - laser.dy * 2);
            this.ctx.stroke();
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
            
            // Head
            this.ctx.beginPath();
            this.ctx.arc(0, -15, 5, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Body
            this.ctx.beginPath();
            this.ctx.moveTo(0, -10);
            this.ctx.lineTo(0, 10);
            this.ctx.stroke();
            
            // Arms
            this.ctx.beginPath();
            // Rotate arms based on gun angle
            const armLength = 8;
            const rightArmX = Math.cos(this.player.gunAngle) * armLength;
            const rightArmY = Math.sin(this.player.gunAngle) * armLength;
            
            this.ctx.moveTo(-8, 0); // Left arm
            this.ctx.lineTo(0, 0);
            this.ctx.lineTo(rightArmX, rightArmY); // Right arm follows gun angle
            this.ctx.stroke();
            
            // Legs
            this.ctx.beginPath();
            this.ctx.moveTo(0, 10);
            this.ctx.lineTo(-8, 20);
            this.ctx.moveTo(0, 10);
            this.ctx.lineTo(8, 20);
            this.ctx.stroke();
            
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
        this.ctx.fillStyle = '#ff0000';
        for (const bullet of this.enemyBullets) {
            const screenX = bullet.x - this.viewportX;
            this.ctx.fillRect(screenX, bullet.y, bullet.width, bullet.height);
        }
    }

    drawUI() {
        // Draw distance counter at top
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Distance: ${this.gameState.distance}m / ${this.gameState.winDistance}m`, 10, 30);
        
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
        
        // Draw charging indicator when holding E
        if (this.isChargingGrenade) {
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.cursor.x, this.cursor.y, 20, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw crosshair
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        
        // Outer circle
        this.ctx.beginPath();
        this.ctx.arc(this.cursor.x, this.cursor.y, 10, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner dot
        this.ctx.beginPath();
        this.ctx.arc(this.cursor.x, this.cursor.y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        
        // Crosshair lines
        this.ctx.beginPath();
        this.ctx.moveTo(this.cursor.x - 15, this.cursor.y);
        this.ctx.lineTo(this.cursor.x - 5, this.cursor.y);
        this.ctx.moveTo(this.cursor.x + 5, this.cursor.y);
        this.ctx.lineTo(this.cursor.x + 15, this.cursor.y);
        this.ctx.moveTo(this.cursor.x, this.cursor.y - 15);
        this.ctx.lineTo(this.cursor.x, this.cursor.y - 5);
        this.ctx.moveTo(this.cursor.x, this.cursor.y + 5);
        this.ctx.lineTo(this.cursor.x, this.cursor.y + 15);
        this.ctx.stroke();
        
        // Draw UI
        this.drawUI();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    spawnEnemy() {
        const screenRight = this.viewportX + this.canvas.width;
        const x = screenRight + Math.random() * 500;
        const groundY = this.getGroundHeight(x);
        
        const enemy = {
            x: x,
            y: groundY - 40,
            width: 30,
            height: 50,
            shootTimer: 0,
            shootInterval: 60 + Math.random() * 60,
            isDying: false,
            deathTimer: 0,
            rotation: 0,
            speedY: 0,
            speedX: -1 - Math.random(),
            movementTimer: 0,
            movementInterval: 120 + Math.random() * 60,
            canShoot: true,
            color: '#ff0000',
            jumpForce: -8 - Math.random() * 4,
            ammo: 10 + Math.floor(Math.random() * 11) // Random ammo between 10-20
        };
        this.enemies.push(enemy);
    }

    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            // Remove enemies that are too far behind
            if (enemy.x < this.viewportX - 200) return false;

            // Update movement
            enemy.movementTimer++;
            if (enemy.movementTimer >= enemy.movementInterval) {
                enemy.movementTimer = 0;
                enemy.speedX = -1 - Math.random() * 2; // New random speed
                if (Math.random() < 0.3) { // 30% chance to jump
                    const groundHeight = this.getGroundHeight(enemy.x);
                    if (Math.abs(enemy.y - (groundHeight - enemy.height)) < 5) {
                        enemy.speedY = enemy.jumpForce;
                    }
                }
            }

            // Apply movement
            enemy.x += enemy.speedX;
            enemy.y += enemy.speedY;
            enemy.speedY += 0.5; // Gravity

            // Check ground collision
            const groundHeight = this.getGroundHeight(enemy.x);
            if (enemy.y >= groundHeight - enemy.height) {
                enemy.y = groundHeight - enemy.height;
                enemy.speedY = 0;
            }

            // Shoot at player
            enemy.shootTimer++;
            if (enemy.shootTimer >= enemy.shootInterval) {
                enemy.shootTimer = 0;
                this.enemyShoot(enemy);
            }

            return true;
        });
    }

    enemyShoot(enemy) {
        if (!enemy.canShoot) return;
        
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const angle = Math.atan2(dy, dx);
        
        // Randomized accuracy between 20% and 80%
        const maxInaccuracy = Math.PI * (0.2 + Math.random() * 0.6);
        const inaccuracy = (Math.random() - 0.5) * maxInaccuracy;
        const finalAngle = angle + inaccuracy;

        if (Math.random() < 0.5) {
            this.enemyBullets.push({
                x: enemy.x,
                y: enemy.y,
                dx: Math.cos(finalAngle) * 8,
                dy: Math.sin(finalAngle) * 8,
                width: 4,
                height: 4
            });
        }
    }

    updateEnemyBullets() {
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;

            // Check collision with player
            if (this.checkCollision(bullet, this.player)) {
                this.player.isDead = true;
                return false;
            }

            // Remove bullets that are off screen
            return bullet.x >= this.viewportX - 100 && 
                   bullet.x <= this.viewportX + this.canvas.width + 100;
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
        // Reset player
        this.player.x = 100;
        this.player.y = this.canvas.height * 0.6 - 40;
        this.player.speedX = 0;
        this.player.speedY = 0;
        this.player.isDead = false;
        this.player.canFly = false;

        // Reset game state
        this.viewportX = 0;
        this.gameState.distance = 0;
        this.gameState.gameWon = false;

        // Clear enemies and bullets
        this.enemies = [];
        this.enemyBullets = [];
        this.deadEnemies = [];
        this.bloodParticles = [];
        this.particles = [];
        this.grenades = [];

        // Reset terrain
        this.terrainDamage.clear();
        this.generateTerrain();

        this.player.ammo = 20; // Reset ammo on death

        // Reset nuke properties
        this.nukeReady = true;
        this.nukeCooldown = 0;
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
        // Create explosion particles
        const particleCount = isCharged ? 100 : 25; // Reduced from 200/50
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = isCharged ? (5 + Math.random() * 8) : (3 + Math.random() * 4); // Reduced speeds
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 2,
                life: isCharged ? 80 : 40, // Reduced from 120/80
                color: isCharged ? '#FF0000' : '#FF4400',
                size: isCharged ? (4 + Math.random() * 4) : (2 + Math.random() * 2) // Reduced sizes
            });
        }

        // Create hole in terrain
        const multiplier = isCharged ? this.chargedGrenadeMultiplier : 1;
        // Calculate hole width to be 1/8 of screen width for charged grenades (reduced from 1/4)
        const baseHoleWidth = isCharged ? (this.canvas.width / 8) : (this.canvas.width / 32);
        const holeWidth = baseHoleWidth * (this.worldWidth / this.canvas.width);
        const holeDepth = this.grenadeRadius * multiplier;
        
        for (let i = 0; i < this.terrain.length; i++) {
            const point = this.terrain[i];
            const dx = point.x - x;
            
            if (Math.abs(dx) < holeWidth) {
                const distanceFromCenter = Math.abs(dx) / holeWidth;
                const deformation = holeDepth * (1 - distanceFromCenter * distanceFromCenter);
                
                // Get current deformation or use original height
                const currentHeight = this.terrainDamage.get(Math.floor(point.x)) || point.originalY;
                const newHeight = currentHeight + deformation;
                
                // Store deformation
                const key = Math.floor(point.x);
                this.terrainDamage.set(key, newHeight);
                point.y = newHeight;
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
            // Set all terrain to a constant height, leaving a thin layer at the bottom
            this.terrain[i].y = this.canvas.height * 0.9; // Move 90% down the screen
            // Update the terrain damage map
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
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 