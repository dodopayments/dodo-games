# Flappy Dodo: The MRR Run

A Flappy Bird-style game with a startup/business theme. Navigate your dodo through obstacles while building MRR (Monthly Recurring Revenue) and avoiding churn.

## How to Play

- **Tap** or press **Space** to make the dodo fly
- Avoid obstacles (pipes) to build your MRR
- The game gets progressively harder as your score increases
- Special obstacles include chargebacks, hostile takeovers, and more

## Running the Game

Simply open `index.html` in a web browser. No build step required for development.

## Building for Production

Run the build script at root of the project to create a minified production version:

```bash
node build.js
```

This will create a top-level `dist` folder with minified HTML, CSS, and JavaScript files ready for deployment.

## Project Structure

- `index.html`              - Main game page
- `assets/script.js`        - Game logic and mechanics
- `assets/style.css`        - Game styling
- `assets/images/{images}`  - Image assets


