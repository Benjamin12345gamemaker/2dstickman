class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        this.worldWidth = 6000;
        this.viewportX = 0;
        
        // Get initial ground height for player spawn
        const initialGroundHeight = this.canvas.height * 0.6;
        
        // Player properties
        this.player = {
            x: 100,
            y: initialGroundHeight - 40,
            width: 20,
            height: 40,
            speedX: 0,
            speedY: 0,
            maxSpeedX: 12,
            acceleration: 0.8,
            friction: 0.92,
            gravity: 0.5,
            jumpForce: -12,
            canJump: true,
            doubleJump: false,
            isSliding: false,
            rotation: 0,
            gunAngle: 0,
            forcedSlide: false,
            canFly: false,
            flyingSpeed: -3.2,
            descendSpeed: 3.0,
            isDead: false,
            capeAnimation: 0, // For cape animation
            flyingAcceleration: 0.4,
            maxFlySpeed: 8,
            currentFlySpeed: 0,
            ammo: 20,
            isFullAuto: true, // Add fire mode property
            currentWeapon: 'rifle', // Default weapon
            isZoomed: false
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
        
        // Diamond properties
        this.diamond = {
            x: 1000 + Math.random() * 2000,
            y: this.canvas.height * 0.7,
            width: 30,
            height: 30,
            collected: false
        };
        
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
        this.wallHealth = 5; // Number of hits to destroy
        this.wallWidth = 30;
        this.wallHeight = 60;
        this.wallDistance = 50; // Distance in front of player
        
        // Bind event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
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
        let currentHeight = this.canvas.height * 0.6;
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
            currentHeight = Math.max(this.canvas.height * 0.3, 
                          Math.min(this.canvas.height * 0.8, currentHeight));
            
            this.terrain.push({
                x: x,
                y: currentHeight,
                originalY: currentHeight // Store original height for deformation
            });
        }
    }

    handleKeyDown(event) {
        switch(event.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
            case 'e': 
                this.isChargingGrenade = true;
                this.keys.e = true;
                break;
            case 'shift': // Add shift key handler
                this.player.isFullAuto = !this.player.isFullAuto;
                break;
            case '1':
                this.player.currentWeapon = 'rifle';
                this.shootInterval = this.weapons.rifle.shootInterval;
                this.player.isZoomed = false;
                break;
            case '2':
                this.player.currentWeapon = 'shotgun';
                this.shootInterval = this.weapons.shotgun.shootInterval;
                break;
            case '3':
                this.player.currentWeapon = 'sniper';
                this.shootInterval = this.weapons.sniper.shootInterval;
                break;
            case '4':
                this.createWoodWall();
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
            if (this.player.currentWeapon === 'shotgun') {
                // Only shoot if we have enough ammo for all pellets
                if (this.player.ammo >= weapon.pellets) {
                    // Shotgun spread - uses one ammo per pellet
                    for (let i = 0; i < weapon.pellets; i++) {
                        const spread = (Math.random() - 0.5) * weapon.spread;
                        const angle = this.player.gunAngle + spread;
                        const laserDx = Math.cos(angle);
                        const laserDy = Math.sin(angle);
                        
                        this.lasers.push({
                            x: this.player.x + 25 * laserDx,
                            y: this.player.y + 25 * laserDy,
                            dx: laserDx * weapon.bulletSpeed,
                            dy: laserDy * weapon.bulletSpeed
                        });
                        this.player.ammo--; // Decrease ammo for each pellet
                    }
                }
            } else if (this.player.ammo > 0) {
                // Rifle or Sniper
                const laserDx = Math.cos(this.player.gunAngle);
                const laserDy = Math.sin(this.player.gunAngle);
                
                this.lasers.push({
                    x: this.player.x + 25 * laserDx,
                    y: this.player.y + 25 * laserDy,
                    dx: laserDx * weapon.bulletSpeed,
                    dy: laserDy * weapon.bulletSpeed
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

    checkDiamondCollection() {
        if (!this.diamond.collected) {
            const dx = this.player.x - this.diamond.x;
            const dy = this.player.y - this.diamond.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 40) {
                this.diamond.collected = true;
                this.player.canFly = true;
                // Create special collection effect
                this.createDiamondCollectionEffect();
            }
        }
    }

    createDiamondCollectionEffect() {
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40;
            const speed = 4 + Math.random() * 4;
            this.particles.push({
                x: this.diamond.x,
                y: this.diamond.y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 2,
                life: 60,
                color: '#00FFFF',
                size: 3 + Math.random() * 3
            });
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

        // Check for diamond collection
        this.checkDiamondCollection();

        // Update grenades
        this.grenades = this.grenades.filter(grenade => {
            if (!grenade.exploded) {
                grenade.x += grenade.speedX;
                grenade.y += grenade.speedY;
                grenade.speedY += 0.4; // Gravity

                const groundHeight = this.getGroundHeight(grenade.x);
                if (grenade.y >= groundHeight) {
                    this.createGrenadeExplosion(grenade.x, grenade.y, grenade.isCharged);
                    grenade.exploded = true;
                }
            }
            return !grenade.exploded;
        });

        // Handle movement with improved smoothness
        if (this.keys.d) {
            this.player.speedX += this.player.acceleration;
        }
        if (this.keys.a) {
            this.player.speedX -= this.player.acceleration;
        }
        
        // Handle jumping with W key when on ground
        if (this.keys.w && this.player.canJump && !this.player.canFly) {
            this.player.speedY = this.player.jumpForce;
            this.player.canJump = false;
        }
        
        // Handle flying with improved smoothness and screen bounds
        if (this.player.canFly) {
            if (this.keys.w) {
                // Don't allow flying above the screen
                if (this.player.y > 20) {
                    this.player.currentFlySpeed = Math.max(
                        this.player.currentFlySpeed - this.player.flyingAcceleration,
                        -this.player.maxFlySpeed
                    );
                } else {
                    this.player.currentFlySpeed = 0;
                    this.player.y = 20;
                }
            } else if (this.keys.s) {
                // Fast descent
                this.player.currentFlySpeed = this.player.descendSpeed;
            } else {
                // Gentle deceleration
                this.player.currentFlySpeed = Math.min(
                    this.player.currentFlySpeed + this.player.flyingAcceleration * 0.5,
                    2
                );
            }
            this.player.speedY = this.player.currentFlySpeed;
        }
        
        // Get terrain info
        const terrainAngle = this.getTerrainAngle(this.player.x);
        const isDownhill = terrainAngle > 0.1;
        
        // Handle sliding with improved physics
        if (this.keys.s && isDownhill && !this.player.canFly) {
            this.player.forcedSlide = true;
            // Enhanced downhill acceleration
            this.player.speedX += Math.sin(terrainAngle) * 1.2;
        } else {
            this.player.forcedSlide = false;
        }
        
        // Apply friction based on slope and sliding state
        let currentFriction = this.player.friction;
        if (isDownhill && (this.player.forcedSlide || this.player.isSliding)) {
            currentFriction = 0.995; // Even less friction when sliding downhill
        }
        this.player.speedX *= currentFriction;
        
        // Limit horizontal speed
        const currentMaxSpeed = isDownhill ? this.player.maxSpeedX * 1.5 : this.player.maxSpeedX;
        this.player.speedX = Math.max(-currentMaxSpeed, Math.min(currentMaxSpeed, this.player.speedX));
        
        // Move player
        this.player.x += this.player.speedX;
        this.player.y += this.player.speedY;
        
        // Get ground height and angle at player position
        const groundHeight = this.getGroundHeight(this.player.x);
        
        // Check if on slope
        const onSlope = Math.abs(terrainAngle) > 0.2;
        this.player.isSliding = onSlope && Math.abs(terrainAngle) > 0.5;
        
        // Modified gravity application
        if (!this.player.canFly || !this.keys.w) {
            if (this.player.y < groundHeight - this.player.height) {
                this.player.speedY += this.player.gravity;
                this.player.canJump = false;
            } else {
                this.player.y = groundHeight - this.player.height;
                this.player.speedY = 0;
                this.player.canJump = true;
                this.player.doubleJump = false;
            }
        }
        
        // Update viewport to follow player
        if (this.player.x > this.canvas.width * 0.4) {
            this.viewportX = this.player.x - this.canvas.width * 0.4;
        }
        
        // Generate more terrain if needed
        if (this.player.x > this.worldWidth - this.canvas.width) {
            this.worldWidth += 3000;
            this.generateTerrain();
        }
        
        // Update player rotation based on terrain
        this.player.rotation = this.player.isSliding ? terrainAngle : 0;

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
        
        // Metallic gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(0.5, '#6a6a6a');
        gradient.addColorStop(1, '#3a3a3a');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Metallic shine
        this.ctx.strokeStyle = '#808080';
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

    drawLasers() {
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        
        for (const laser of this.lasers) {
            const screenX = laser.x - this.viewportX;
            
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, laser.y);
            this.ctx.lineTo(screenX - laser.dx, laser.y - laser.dy);
            this.ctx.stroke();
        }
    }

    drawDiamond() {
        if (!this.diamond.collected) {
            const screenX = this.diamond.x - this.viewportX;
            
            // Draw diamond shape
            this.ctx.save();
            this.ctx.translate(screenX, this.diamond.y);
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, -15);
            this.ctx.lineTo(15, 0);
            this.ctx.lineTo(0, 15);
            this.ctx.lineTo(-15, 0);
            this.ctx.closePath();
            
            // Create shimmering effect
            const gradient = this.ctx.createLinearGradient(-15, -15, 15, 15);
            gradient.addColorStop(0, '#00FFFF');
            gradient.addColorStop(0.5, '#FFFFFF');
            gradient.addColorStop(1, '#00FFFF');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }

    drawPlayer() {
        const screenX = this.player.x - this.viewportX;
        
        this.ctx.save();
        this.ctx.translate(screenX + this.player.width/2, this.player.y + this.player.height/2);
        this.ctx.rotate(this.player.rotation);
        
        // Draw stick figure
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        
        if (this.player.canFly && this.keys.w) {
            // Superman pose
            // Draw cape
            this.ctx.beginPath();
            const capeWave = Math.sin(this.player.capeAnimation) * 5;
            this.ctx.moveTo(-5, -15);
            this.ctx.quadraticCurveTo(
                -15, -5 + capeWave,
                -25, 10 + capeWave
            );
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.stroke();
            
            // Horizontal body for flying
            this.ctx.strokeStyle = '#000';
            this.ctx.beginPath();
            this.ctx.moveTo(-10, 0);
            this.ctx.lineTo(10, 0);
            this.ctx.stroke();
            
            // Forward-pointing arms
            this.ctx.beginPath();
            this.ctx.moveTo(10, 0);
            this.ctx.lineTo(20, -5);
            this.ctx.moveTo(10, 0);
            this.ctx.lineTo(20, 5);
            this.ctx.stroke();
            
            // Head
            this.ctx.beginPath();
            this.ctx.arc(-5, 0, 5, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Straight legs
            this.ctx.beginPath();
            this.ctx.moveTo(-10, 0);
            this.ctx.lineTo(-20, -5);
            this.ctx.moveTo(-10, 0);
            this.ctx.lineTo(-20, 5);
            this.ctx.stroke();
        } else {
            // Normal stick figure drawing (existing code)
            // Body
            this.ctx.beginPath();
            this.ctx.moveTo(0, -15);
            this.ctx.lineTo(0, 10);
            this.ctx.stroke();
            
            // Head
            this.ctx.beginPath();
            this.ctx.arc(0, -20, 5, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Arms and gun
            this.ctx.beginPath();
            this.ctx.moveTo(0, -5);
            this.ctx.lineTo(-8, 5);
            this.ctx.moveTo(0, -5);
            
            // Gun arm follows mouse
            this.ctx.save();
            this.ctx.rotate(this.player.gunAngle);
            this.ctx.lineTo(15, 0);
            this.ctx.lineTo(25, 0);
            this.ctx.moveTo(15, -2);
            this.ctx.lineTo(15, 2);
            this.ctx.stroke();
            this.ctx.restore();
            
            // Legs
            this.ctx.beginPath();
            this.ctx.moveTo(0, 10);
            this.ctx.lineTo(-8, 20);
            this.ctx.moveTo(0, 10);
            this.ctx.lineTo(8, 20);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
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
    }

    drawWalls() {
        for (const wall of this.walls) {
            const screenX = wall.x - this.viewportX;
            
            this.ctx.save();
            this.ctx.translate(screenX, wall.y);
            this.ctx.rotate(wall.rotation);
            
            // Draw wooden texture
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(-wall.width/2, -wall.height/2, wall.width, wall.height);
            
            // Draw wood grain lines
            this.ctx.strokeStyle = '#654321';
            this.ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(-wall.width/2, -wall.height/2 + i * wall.height/5);
                this.ctx.lineTo(wall.width/2, -wall.height/2 + i * wall.height/5);
                this.ctx.stroke();
            }
            
            // Draw health indicator
            const healthPercentage = wall.health / this.wallHealth;
            this.ctx.fillStyle = `rgba(0, 255, 0, ${healthPercentage})`;
            this.ctx.fillRect(-wall.width/2, -wall.height/2 - 5, wall.width * healthPercentage, 3);
            
            this.ctx.restore();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw terrain
        this.drawMetallicTerrain();
        
        // Draw diamond
        this.drawDiamond();
        
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

        // Reset diamond
        this.diamond.collected = false;
        this.diamond.x = 1000 + Math.random() * 2000;

        // Reset terrain
        this.terrainDamage.clear();
        this.generateTerrain();

        this.player.ammo = 20; // Reset ammo on death
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
        const dx = this.cursor.x - (this.player.x - this.viewportX);
        const dy = this.cursor.y - this.player.y;
        const angle = Math.atan2(dy, dx);
        
        this.grenades.push({
            x: this.player.x,
            y: this.player.y,
            speedX: Math.cos(angle) * this.grenadeThrowPower,
            speedY: Math.sin(angle) * this.grenadeThrowPower,
            exploded: false,
            isCharged: true
        });
    }

    createGrenadeExplosion(x, y, isCharged = false) {
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
            y: wallY,
            width: this.wallWidth,
            height: this.wallHeight,
            health: this.wallHealth,
            rotation: this.player.gunAngle
        });
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 