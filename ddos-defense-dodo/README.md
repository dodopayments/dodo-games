# Defend the Gateway

A tower defense-style arcade game where you protect DoDo Payments' gateway from a DDoS attack. Click or tap incoming bot requests to block them before they overwhelm your system.

## How to Play

- **Click** or **Tap** on enemy bots to block malicious packets
- Protect the core (DoDo logo) at the center of the screen
- Earn bandwidth points for each blocked request
- Use points to purchase upgrades between waves
- Survive as many waves as possible before the gateway fails

## Upgrades

- **Firewall** (500 pts) - Auto-targeting defense system that shoots nearby threats
- **Rate Limiter** (800 pts) - Slows down incoming bot requests
- **Reboot** (300 pts) - Restores 20% core integrity

## Running the Game

Simply open `index.html` in a web browser. No build step required.

## Features

- Procedurally generated sound effects using Web Audio API (no audio files needed)
- Progressive difficulty scaling with wave system
- Mobile-friendly touch controls
- High score tracking via localStorage
- Share your results on Twitter

## Building for Production

Run the build script at root of the project to create a minified production version:

```bash
node build.js
```

This will create a top-level `dist` folder with minified HTML, CSS, and JavaScript files ready for deployment.

## Project Structure

- `index.html`                  - Main game page
- `assets/script.js`            - Game engine and logic
- `assets/style.css`            - Game styling
- `assets/images/dodo-logo.png` - DoDo Payments logo
