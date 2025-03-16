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

        // Create sound pools for frequently played sounds
        this.soundPools = {
            shoot: Array(5).fill().map(() => new Audio('sounds/retro-laser-1-236669.mp3')),
            explosion: Array(3).fill().map(() => new Audio('sounds/explosion.mp3')),
            enemyDeath: Array(3).fill().map(() => new Audio('sounds/enemy_death.mp3')),
            hit: Array(3).fill().map(() => new Audio('sounds/hit.mp3'))
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
            acceleration: 0.8,    // Reduced for better ship control
            friction: .95,      // Increased friction to prevent excessive gliding
            gravity: 0.6,        // Reduced gravity for better jump control
            jumpForce: -12,      // Adjusted jump force
            canJump: true,
            doubleJump: true,    // Added double jump
            isSliding: false,
            rotation: 0,
            gunAngle: 0,
            forcedSlide: false,
            canFly: true,
            flyingSpeed: -6,
            descendSpeed: 3,
            isDead: false,
            capeAnimation: 0,
            flyingAcceleration: 0.45,
            maxFlySpeed: 12,
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
            octaLaserAvailable: true,  // New property for one-time use
            octaLaser: null,  // New property for the 8-beam laser
            octaLaserRotation: 0  // New property for rotation angle
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
                launchForce: 30,  // Reduced from 40 to 30
                color: '#4488ff'
            }
        };

        // Input handling
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            e: false,
            shift: false,
            '1': false,
            '2': false,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
            '8': false
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
        this.laserPower = 20;
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
            level: 1,
            maxEnemies: 7  // Also update the game state max enemies
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
        
        // Add special laser cooldown properties
        this.specialLaserCooldown = 0;
        this.specialLaserMaxCooldown = 10 * 60; // 10 seconds cooldown at 60fps
        
        // Add nuke animation properties
        this.nukeCountdown = 0;
        this.nukeFlashIntensity = 0;
        this.isNukeAnimationActive = false;
        this.nukeAnimationFrame = 0;
        this.lastCountdownNumber = 5;
        this.flashSpeed = 0.2; // Controls flash speed
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
            case ' ': // Space bar
                if (!this.specialLaser && this.specialLaserDuration <= 0 && this.specialLaserCooldown <= 0) {
                    this.createSpecialLaser();
                }
                break;
            case '8':
                if (this.player.octaLaserAvailable) {
                    this.createOctaLaser();
                    this.player.octaLaserAvailable = false;  // Can only use once
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
        if (!this.gameStarted) {
            if (!this.showCharacterSelect) {
                this.showCharacterSelect = true;
                return;
            }

            // Handle character selection
            const boxWidth = 200;
            const boxHeight = 200;
            const spacing = 100;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;

            const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = event.clientY - this.canvas.getBoundingClientRect().top;

            // Check if clicked on spaceship box
            if (mouseX >= centerX - boxWidth - spacing/2 && 
                mouseX <= centerX - spacing/2 &&
                mouseY >= centerY - boxHeight/2 &&
                mouseY <= centerY + boxHeight/2) {
                this.isSpaceship = true;
                this.gameStarted = true;
            }
            // Check if clicked on stick figure box
            else if (mouseX >= centerX + spacing/2 &&
                     mouseX <= centerX + boxWidth + spacing/2 &&
                     mouseY >= centerY - boxHeight/2 &&
                     mouseY <= centerY + boxHeight/2) {
                this.isSpaceship = false;
                this.gameStarted = true;
            }
            return;
        }

        // Check for retry button click on death or victory screen
        if ((this.player.isDead || this.gameState.gameWon) && this.retryButton) {
            const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
            const mouseY = event.clientY - this.canvas.getBoundingClientRect().top;

            if (mouseX >= this.retryButton.x && 
                mouseX <= this.retryButton.x + this.retryButton.width &&
                mouseY >= this.retryButton.y && 
                mouseY <= this.retryButton.y + this.retryButton.height) {
                this.restartGame();
                this.gameStarted = false;
                this.showCharacterSelect = false;
                return;
            }
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
                    color: '#00FF00'  // Changed to match player color
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
                        color: '#00FF00',  // Changed to match player color
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
                            color: '#00FF00'  // Changed to match player color
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
                    color: '#00FF00'  // Changed to match player color
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
        
        // Calculate the minimum allowed height (indestructible layer)
        const baseMinHeight = this.canvas.height * (8/9); // Bottom 1/9 is indestructible
        
        // Generate random slope direction for this deformation
        const slopeDirection = Math.random() < 0.5 ? -1 : 1;
        const slopeIntensity = 0.3 + Math.random() * 0.4; // Random slope steepness
        
        // Find affected terrain points
        for (let i = 0; i < this.terrain.length; i++) {
            const point = this.terrain[i];
            const dx = point.x - worldX;
            
            // Create a sloped tunnel effect centered on hit point
            if (Math.abs(dx) < tunnelHalfWidth) {
                // Calculate jagged, rounded indestructible layer height
                const jaggedness = Math.sin(point.x * 0.05) * 20; // Sine wave for rounded pattern
                const noise = Math.sin(point.x * 0.2) * 10; // Additional noise for jaggedness
                const minHeight = baseMinHeight + jaggedness + noise;
                
                // Calculate slope offset based on distance from center
                const slopeOffset = (dx / tunnelHalfWidth) * slopeIntensity * 40 * slopeDirection;
                
                // Get current deformation or use original height
                const currentHeight = this.terrainDamage.get(Math.floor(point.x)) || point.originalY;
                
                // Calculate how much to dig based on distance from laser hit point
                const distanceFromHit = Math.abs(y - currentHeight);
                const verticalOffset = distanceFromHit < 60 ? 80 : 40;
                
                // Calculate new height with slope and prevent extreme spikes
                let newHeight = currentHeight + verticalOffset + slopeOffset;
                
                // Ensure we don't go below the jagged minimum height
                newHeight = Math.min(newHeight, minHeight);
                
                // Prevent extreme height differences between adjacent points
                if (i > 0) {
                    const prevHeight = this.terrain[i-1].y;
                    const maxDiff = 50; // Maximum allowed height difference
                    if (Math.abs(newHeight - prevHeight) > maxDiff) {
                        newHeight = prevHeight + (maxDiff * Math.sign(newHeight - prevHeight));
                    }
                }
                
                // Store deformation
                const key = Math.floor(point.x);
                this.terrainDamage.set(key, newHeight);
                point.y = newHeight;
                
                // Add some randomness to nearby points for more natural look
                if (i > 0 && Math.random() < 0.3) {
                    const prevPoint = this.terrain[i-1];
                    const prevHeight = this.terrainDamage.get(Math.floor(prevPoint.x)) || prevPoint.originalY;
                    const smoothedHeight = (newHeight + prevHeight) / 2 + (Math.random() - 0.5) * 10;
                    const smoothedFinalHeight = Math.min(smoothedHeight, 
                        baseMinHeight + Math.sin(prevPoint.x * 0.05) * 20 + Math.sin(prevPoint.x * 0.2) * 10);
                    this.terrainDamage.set(Math.floor(prevPoint.x), smoothedFinalHeight);
                    prevPoint.y = smoothedFinalHeight;
                }
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
                    this.player.ammo += enemy.ammo;
                    this.deadEnemies.push(enemy);
                    this.enemies.splice(i, 1);
                    this.createBloodEffect(enemy.x, enemy.y);
                    this.audio.play('enemyDeath');
                    this.gameState.killCount++;
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
                        return false;
                    }
                    return true;
                });
            }
        }

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
            if (currentSpeed > 122) {  // Changed from 61 to 122 (2x faster)
                const angle = Math.atan2(this.player.speedY, this.player.speedX);
                this.player.speedX = Math.cos(angle) * 122;  // Changed from 61 to 122
                this.player.speedY = Math.sin(angle) * 122;  // Changed from 61 to 122
            }
        } else {
            // Stick figure movement - affected by gravity
            if (this.keys.d) {
                this.player.speedX = Math.min(this.player.speedX + this.player.acceleration, this.player.maxSpeedX);
            }
            if (this.keys.a) {
                this.player.speedX = Math.max(this.player.speedX - this.player.acceleration, -this.player.maxSpeedX);
            }
            if (!this.keys.a && !this.keys.d) {
                // Apply friction to gradually slow down
                this.player.speedX *= this.player.friction;
            }
            
            // Apply gravity
            this.player.speedY += this.player.gravity;
            
            // Get ground height for collision
            const groundHeight = this.getGroundHeight(this.player.x);
            
            // Check ground collision with proper hitbox
            if (this.player.y + this.player.height >= groundHeight) {
                this.player.y = groundHeight - this.player.height;
                this.player.speedY = 0;
                this.player.canJump = true;
                this.player.doubleJump = true;
            }
            
            // Handle initial jump and double jump (only on key press)
            if (this.keys.w && this.player.lastWKeyState === false) {
                if (this.player.canJump) {
                    this.player.speedY = this.player.jumpForce;
                    this.player.canJump = false;
                    this.audio.play('jump');
                } else if (this.player.doubleJump) {
                    this.player.speedY = this.player.jumpForce * 0.8; // Slightly weaker double jump
                    this.player.doubleJump = false;
                    this.audio.play('jump');
                }
            }
            
            // Jetpack functionality when holding W (after initial jump)
            if (this.keys.w && !this.player.canJump && !this.isSpaceship) {
                // Apply upward force
                this.player.speedY = Math.max(this.player.speedY - 1.2, -8); // Cap upward speed
                
                // Create jetpack particles
                for (let i = 0; i < 3; i++) {
                    const spread = (Math.random() - 0.5) * 0.5;
                    const speed = 3 + Math.random() * 4;
                    this.particles.push({
                        x: this.player.x,
                        y: this.player.y + this.player.height - 10,
                        dx: Math.cos(Math.PI/2 + spread) * speed,
                        dy: Math.sin(Math.PI/2 + spread) * speed,
                        life: 15 + Math.random() * 10,
                        color: '#FF4400',
                        size: 2 + Math.random() * 2
                    });
                }
                
                // Play jetpack sound
                this.audio.play('fly');
            }
            
            // Store current W key state for next frame
            this.player.lastWKeyState = this.keys.w;
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
        
        // Update viewport to move when player is 3/4 of the way to screen edge
        const viewportThreshold = this.canvas.width * 0.75; // 3/4 of screen width
        if (this.player.x - this.viewportX > viewportThreshold) {
            this.viewportX = this.player.x - viewportThreshold;
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

        // Check if level is complete
        if (this.gameState.killCount >= this.gameState.requiredKills && this.gameState.level === 1) {
            this.startLevel2();
        } else if (this.gameState.killCount >= this.gameState.requiredKills * 2 && this.gameState.level === 2) {
            this.gameState.gameWon = true;
        }

        // Update octa laser
        if (this.player.octaLaser) {
            this.player.octaLaser.x = this.player.x;
            this.player.octaLaser.y = this.player.y;
            this.player.octaLaser.rotation += 0.02;  // Rotation speed
            this.player.octaLaser.duration--;

            // Check enemy collisions with all 8 beams
            for (let i = 0; i < 8; i++) {
                const angle = this.player.octaLaser.rotation + (Math.PI * 2 * i / 8);
                const endX = this.player.octaLaser.x + Math.cos(angle) * 2000;
                const endY = this.player.octaLaser.y + Math.sin(angle) * 2000;

                this.enemies = this.enemies.filter(enemy => {
                    const dx = enemy.x - this.player.octaLaser.x;
                    const dy = enemy.y - this.player.octaLaser.y;
                    const enemyAngle = Math.atan2(dy, dx);
                    const angleDiff = Math.abs(((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - 
                                             ((enemyAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
                    
                    if (angleDiff < 0.1 && Math.sqrt(dx * dx + dy * dy) < 2000) {
                        this.createBloodEffect(enemy.x, enemy.y);
                        this.audio.play('enemyDeath');
                        this.gameState.killCount++;
                        return false;
                    }
                    return true;
                });
            }

            if (this.player.octaLaser.duration <= 0) {
                this.player.octaLaser = null;
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

        // Draw octa laser if active
        if (this.player.octaLaser) {
            const screenX = this.player.octaLaser.x - this.viewportX;
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 8;

            // Draw all 8 beams
            for (let i = 0; i < 8; i++) {
                const angle = this.player.octaLaser.rotation + (Math.PI * 2 * i / 8);
                this.ctx.beginPath();
                this.ctx.moveTo(screenX, this.player.octaLaser.y);
                this.ctx.lineTo(
                    screenX + Math.cos(angle) * 2000,
                    this.player.octaLaser.y + Math.sin(angle) * 2000
                );
                this.ctx.stroke();

                // Add glow effect
                this.ctx.strokeStyle = '#00FF0044';
                this.ctx.lineWidth = 16;
                this.ctx.stroke();
                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 8;
            }
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
            // Draw LeBron James stick figure
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
        this.ctx.fillStyle = '#ff0000';
        for (const bullet of this.enemyBullets) {
            const screenX = bullet.x - this.viewportX;
            this.ctx.fillRect(screenX - 4, bullet.y - 4, 8, 8); // Made bullets bigger (8x8 instead of 4x4)
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
        const killText = `Level ${this.gameState.level} - Kills: ${this.gameState.killCount}/${this.gameState.level === 1 ? this.gameState.requiredKills : this.gameState.requiredKills * 2}`;
        const killMetrics = this.ctx.measureText(killText);
        this.ctx.fillRect(this.canvas.width - killMetrics.width - 30, this.canvas.height - 40, killMetrics.width + 20, 30);
        this.ctx.fillStyle = '#00FF00';
        this.ctx.font = 'bold 20px Arial';
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

        // Draw octa laser availability
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, this.canvas.height - 180, 150, 30);
        this.ctx.fillStyle = this.player.octaLaserAvailable ? '#00FFFF' : '#FF0000';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(
            this.player.octaLaserAvailable ? 'OCTA LASER: READY' : 'OCTA LASER: USED',
            20, 
            this.canvas.height - 160
        );
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
        
        this.ctx.restore();
        
        // Draw UI elements without zoom
        this.drawUI();
    }

    drawStartScreen() {
        // Draw background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000033');
        gradient.addColorStop(1, '#000066');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.showCharacterSelect) {
            // Draw "Start Game" text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Click to Start', this.canvas.width / 2, this.canvas.height / 2);
        } else {
            // Draw character selection screen
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.fillText('Choose Your Character', this.canvas.width / 2, this.canvas.height / 4);

            // Draw selection boxes
            const boxWidth = 200;
            const boxHeight = 200;
            const spacing = 100;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;

            // Spaceship box
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(centerX - boxWidth - spacing/2, centerY - boxHeight/2, boxWidth, boxHeight);
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText('Spaceship', centerX - boxWidth/2 - spacing/2, centerY + boxHeight/2 + 40);

            // Draw spaceship preview
            this.ctx.save();
            this.ctx.translate(centerX - boxWidth/2 - spacing/2, centerY);
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.beginPath();
            this.ctx.moveTo(25, 0);
            this.ctx.lineTo(-15, -12);
            this.ctx.lineTo(-10, 0);
            this.ctx.lineTo(-15, 12);
            this.ctx.lineTo(25, 0);
            this.ctx.stroke();
            this.ctx.restore();

            // Stick figure box
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.strokeRect(centerX + spacing/2, centerY - boxHeight/2, boxWidth, boxHeight);
            this.ctx.fillText('Stick Figure', centerX + boxWidth/2 + spacing/2, centerY + boxHeight/2 + 40);

            // Draw stick figure preview
            this.ctx.save();
            this.ctx.translate(centerX + boxWidth/2 + spacing/2, centerY);
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.beginPath();
            // Head
            this.ctx.arc(0, -30, 10, 0, Math.PI * 2);
            // Body
            this.ctx.moveTo(0, -20);
            this.ctx.lineTo(0, 20);
            // Arms
            this.ctx.moveTo(-15, 0);
            this.ctx.lineTo(15, 0);
            // Legs
            this.ctx.moveTo(0, 20);
            this.ctx.lineTo(-15, 45);
            this.ctx.moveTo(0, 20);
            this.ctx.lineTo(15, 45);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawDeathScreen() {
        // Dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Game Over text
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

        // Stats
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Distance: ${this.gameState.distance}m`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText(`Kills: ${this.gameState.killCount}`, this.canvas.width / 2, this.canvas.height / 2 + 50);

        // Draw retry button
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
        this.ctx.fillText('RETRY', this.canvas.width / 2, buttonY + buttonHeight / 2);

        // Store button coordinates for click handling
        this.retryButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
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
        // Calculate spawn position relative to player
        const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
        const spawnDistance = 500 + Math.random() * 300; // Spawn 500-800 pixels away
        
        // Calculate spawn position
        const x = spawnSide === 'left' ? 
            this.player.x - spawnDistance : 
            this.player.x + spawnDistance;
            
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
            speedX: 0, // Initial speed will be set in updateEnemies
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
            // Remove enemies that are too far behind or ahead
            if (enemy.x < this.viewportX - 500 || enemy.x > this.viewportX + this.canvas.width + 500) return false;

            // Calculate direction to player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // Update movement - chase player
            if (distanceToPlayer > 200) { // Keep some distance
                // Move towards player
                enemy.speedX = Math.sign(dx) * (1 + Math.random());
            } else {
                // Maintain distance and strafe
                enemy.speedX = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random());
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
                
                // Random jumping while chasing
                if (Math.random() < 0.02) { // 2% chance to jump each frame
                    enemy.speedY = enemy.jumpForce;
                }
            }

            // Update shooting behavior
            enemy.shootTimer++;
            const shootInterval = this.gameState.level === 1 ? enemy.shootInterval : enemy.shootInterval * 0.5;
            if (enemy.shootTimer >= shootInterval && distanceToPlayer < 800) { // Only shoot when within range
                enemy.shootTimer = 0;
                this.enemyShoot(enemy);
            }

            // Check collision with player for ammo pickup
            if (this.checkCollision(enemy, this.player)) {
                const ammoPickup = Math.min(enemy.ammo, this.player.maxAmmo - this.player.ammo);
                if (ammoPickup > 0) {
                    this.player.ammo = Math.min(this.player.maxAmmo, this.player.ammo + ammoPickup);
                    this.audio.play('collect');
                }
            }

            return true;
        });

        // Check if level is complete
        if (this.gameState.killCount >= this.gameState.requiredKills && this.gameState.level === 1) {
            this.startLevel2();
        } else if (this.gameState.killCount >= this.gameState.requiredKills * 2 && this.gameState.level === 2) {
            this.gameState.gameWon = true;
        }
    }

    enemyShoot(enemy) {
        if (!enemy.canShoot) return;
        
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const angle = Math.atan2(dy, dx);
        
        // Improved accuracy - now 75% inaccurate (25% accurate)
        const maxInaccuracy = Math.PI * 0.75;
        const inaccuracy = (Math.random() - 0.5) * maxInaccuracy;
        const finalAngle = angle + inaccuracy;

        // Increased shooting chance
        if (Math.random() < 0.7) { // 70% chance to shoot when timer allows
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

            // Check collision with player and apply damage
            if (this.checkCollision(bullet, this.player)) {
                this.player.health -= 20; // Each bullet deals 20 damage
                if (this.player.health <= 0) {
                    this.player.isDead = true;
                }
                this.audio.play('hit');
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
            acceleration: 0.8,
            friction: 0.95,
            gravity: 0.6,
            jumpForce: -12,
            canJump: true,
            doubleJump: true,
            isSliding: false,
            rotation: 0,
            gunAngle: 0,
            forcedSlide: false,
            canFly: true,
            flyingSpeed: -6,
            descendSpeed: 3,
            isDead: false,
            capeAnimation: 0,
            flyingAcceleration: 0.45,
            maxFlySpeed: 12,
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
            octaLaserAvailable: true,  // New property for one-time use
            octaLaser: null,  // New property for the 8-beam laser
            octaLaserRotation: 0  // New property for rotation angle
        };

        // Reset game state
        this.gameState = {
            distance: 0,
            winDistance: 15000,
            gameWon: false,
            killCount: 0,
            requiredKills: 100,
            level: 1,
            maxEnemies: 7  // Also update the game state max enemies
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
            e: false
        };
        this.mouseDown = false;
        this.isChargingGrenade = false;

        // Reset camera
        this.cameraZoom = 1.0;
        this.player.octaLaserAvailable = true;  // Reset octa laser availability
        this.player.octaLaser = null;
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
        const particleCount = isCharged ? 50 : 15; // Reduced particle count
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = isCharged ? (3 + Math.random() * 4) : (2 + Math.random() * 3); // Reduced speeds
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 2,
                life: isCharged ? 60 : 30, // Reduced particle life
                color: isCharged ? '#FF0000' : '#FF4400',
                size: isCharged ? (3 + Math.random() * 3) : (2 + Math.random() * 2) // Reduced sizes
            });
        }

        // Calculate blast radius - significantly reduced
        const blastRadius = isCharged ? 150 : 75; // Halved blast radius

        // Check for enemies in blast radius
        this.enemies = this.enemies.filter(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= blastRadius) {
                enemy.isDying = true;
                enemy.deathTimer = 0;
                enemy.speedY = -5;
                enemy.color = '#000000';
                enemy.canShoot = false;
                this.deadEnemies.push(enemy);
                this.createBloodEffect(enemy.x, enemy.y);
                this.audio.play('enemyDeath');
                this.gameState.killCount++;
                return false;
            }
            return true;
        });

        // Create smaller hole in terrain
        const multiplier = isCharged ? 5 : 1; // Reduced from 10 to 5 for charged grenades
        const baseHoleWidth = isCharged ? (this.canvas.width / 16) : (this.canvas.width / 48); // Reduced hole width
        const holeWidth = baseHoleWidth * (this.worldWidth / this.canvas.width);
        const holeDepth = 20 * multiplier; // Significantly reduced from grenadeRadius * multiplier
        
        // Calculate base minimum height (indestructible layer)
        const baseMinHeight = this.canvas.height * (8/9); // Bottom 1/9 is indestructible
        
        // Generate random slope direction for this explosion
        const slopeDirection = Math.random() < 0.5 ? -1 : 1;
        const slopeIntensity = 0.2 + Math.random() * 0.3; // Reduced slope intensity
        
        for (let i = 0; i < this.terrain.length; i++) {
            const point = this.terrain[i];
            const dx = point.x - x;
            
            if (Math.abs(dx) < holeWidth) {
                // Calculate jagged, rounded indestructible layer height
                const jaggedness = Math.sin(point.x * 0.05) * 20;
                const noise = Math.sin(point.x * 0.2) * 10;
                const minHeight = baseMinHeight + jaggedness + noise;
                
                // Calculate slope offset based on distance from center
                const slopeOffset = (dx / holeWidth) * slopeIntensity * 20 * slopeDirection; // Reduced from 40 to 20
                
                const distanceFromCenter = Math.abs(dx) / holeWidth;
                const deformation = holeDepth * (1 - distanceFromCenter * distanceFromCenter);
                
                const currentHeight = this.terrainDamage.get(Math.floor(point.x)) || point.originalY;
                let newHeight = currentHeight + deformation + slopeOffset;
                
                // Ensure we don't go below the jagged minimum height
                newHeight = Math.max(newHeight, minHeight);
                
                // Prevent extreme height differences between adjacent points
                if (i > 0) {
                    const prevHeight = this.terrain[i-1].y;
                    const maxDiff = 30; // Reduced from 50 to 30 for smoother transitions
                    if (Math.abs(newHeight - prevHeight) > maxDiff) {
                        newHeight = prevHeight + (maxDiff * Math.sign(newHeight - prevHeight));
                    }
                }
                
                const key = Math.floor(point.x);
                this.terrainDamage.set(key, newHeight);
                point.y = newHeight;
                
                // Add some randomness to nearby points for more natural look
                if (i > 0 && Math.random() < 0.3) {
                    const prevPoint = this.terrain[i-1];
                    const prevHeight = this.terrainDamage.get(Math.floor(prevPoint.x)) || prevPoint.originalY;
                    const smoothedHeight = (newHeight + prevHeight) / 2 + (Math.random() - 0.5) * 5; // Reduced random variation
                    const smoothedFinalHeight = Math.max(
                        baseMinHeight + Math.sin(prevPoint.x * 0.05) * 20 + Math.sin(prevPoint.x * 0.2) * 10,
                        smoothedHeight
                    );
                    this.terrainDamage.set(Math.floor(prevPoint.x), smoothedFinalHeight);
                    prevPoint.y = smoothedFinalHeight;
                }
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
        this.gameState.level = 2;
        this.gameState.maxEnemies = 7; // Keep consistent max enemies in level 2
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

    createOctaLaser() {
        this.audio.play('shoot');
        this.player.octaLaser = {
            x: this.player.x,
            y: this.player.y,
            rotation: 0,
            duration: 10 * 60  // 10 seconds at 60fps
        };
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 