# Stick Figure Multiplayer Game

A multiplayer browser-based stick figure shooting game where players can interact and shoot each other.

## Features

- Real-time multiplayer gameplay
- Bullet physics with realistic bouncing
- Player vs player combat
- Terrain deformation
- Multiple weapons
- Health system and respawning

## How to Run

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```
git clone <repository-url>
cd stick-figure-multiplayer
```

2. Install dependencies:
```
npm install
```

3. Start the server:
```
npm start
```

4. Open the game in your browser:
```
http://localhost:3000
```

### Multiplayer Setup

To play with friends:

1. Make sure your server is running on a machine that's accessible to other players
2. Share your IP address or domain with other players
3. Have them connect to `http://<your-ip-address>:3000`
4. Each player will automatically join the same game session

## Controls

- **WASD**: Move character
- **Mouse**: Aim
- **Left Click**: Shoot
- **Space**: Jump
- **1-4**: Switch weapons
- **R**: Reload

## Development

To run the server in development mode with auto-restart:

```
npm run dev
```

## Customization

You can modify the following settings in the game:

- `isMultiplayer`: Set to `false` in game.js to play in single-player mode
- Player colors are randomly assigned but can be customized in the server.js file

## Troubleshooting

- If you can't connect to the server, check your firewall settings
- Make sure port 3000 is open if you're hosting the game
- Check the browser console for any error messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.
