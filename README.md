# LyricsRay

A NextJS app for parents and guardians to get an analysis of song lyrics to check for appropriateness for their children aged 21 and under.

## Project structure

Basic project structure for development:

```
├── deploy
    ├── terraform
├── web
    ├── public
    ├── src
```

The deploy folder contains all terraform/CI/CD related files.
The web folder contains the NextJS app.

## Getting Started with the NextJS app

First, change directory into `web` and install npm dependencies:

```bash
cd web
npm run install
```

Next, create a .env with the following variables:

```
APP_NAME=LyricsRay
APP_VERSION=v1.0
APP_URL=https://localhost:3000
ENV=dev
IS_LOCAL=1
ANTHROPIC_MODEL=claude-4-sonnet-20250514
ANTHROPIC_API_KEY=<hidden>
ALTCHA_KEY=<hidden>
ALTCHA_SECRET=<hidden>
```

Note, you'll have to enter real values for the variables marked as `<hidden>`. After that, you should be good to go.
Below are some commands to start up the app in the browser and other helpful commands.

### To start the development server

```bash
npm run dev
```
_Will start up under `http://localhost:3000`_

### To run tests

```bash
npm run test
```

### To run the linter

```bash
npm run lint
```

### To build a production version of the app

```bash
npm run build
```
