# Contributing to Dodo Games

Thank you for your interest in contributing to Dodo Games! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your contribution
4. Make your changes
5. Test your changes locally
6. Submit a pull request

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/dodo-games.git
   cd dodo-games
   ```

2. Test locally:
   - Navigate to any game directory
   - Open `index.html` in your browser
   - Test the game functionality

3. Build for production:
   ```bash
   npm run build
   ```

## Adding a New Game

1. Create a new directory in the root (e.g., `my-game/`)
2. Add your game files:
   - `index.html` - Main game HTML
   - `script.js` - Game logic
   - `style.css` - Game styling
   - `assets/` - Images, sounds, etc. (optional)
   - `README.md` - Game-specific documentation (optional)

3. Update the root `index.html` to include a link to your new game

4. Test locally before submitting

5. Ensure your game:
   - Is self-contained in its own directory
   - Uses relative paths for assets
   - Works in modern browsers
   - Is themed appropriately for Dodo Payments

## Code Style

- Keep code clean and readable
- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns in the repository

## Submitting Changes

1. Ensure your code is tested and working
2. Run `npm run build` to verify the build process works
3. Write a clear commit message describing your changes
4. Push to your fork and create a pull request
5. Provide a description of what you've added or changed

## Pull Request Process

1. Update the README.md if you're adding a new game
2. Ensure all games still work after your changes
3. Wait for review and feedback
4. Address any requested changes

## Questions?

If you have questions or need help, please open an issue in the repository.

Thank you for contributing to Dodo Games!

