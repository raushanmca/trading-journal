# Backend Developer README

## Overview

This is the Node.js + Express backend for the Trading Journal app.

- Runtime: Node.js
- Framework: Express 5
- Database: MongoDB with Mongoose
- Config: `dotenv`

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB connection string

## Setup

```bash
cd backend
npm install
```

## Environment Variables

Create `backend/.env`:

```bash
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<db_name>
JWT_SECRET=replace_with_strong_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

Required for current server startup:

- `MONGO_URI`

Used by auth route implementation (`routes/auth.js`):

- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## Run Locally

```bash
cd backend
npm run dev
```

or:

```bash
cd backend
npm start
```

Default backend URL: `http://localhost:5000`

## Available Scripts

- `npm run dev`: Start with nodemon
- `npm start`: Start with node
- `npm test`: Placeholder script (not implemented)

## API Endpoints

Mounted in `server.js`:

- `GET /` health message
- `GET /api/journal` fetch all journal entries
- `POST /api/journal` create a journal entry

Journal payload fields are defined in `models/Journal.js` (for example: `date`, `marketBias`, `instrument`, `entryPrice`, `pnl`, `mistakes`, `emotionalState`, `aiInsight`, and more).

## Important Integration Note

`routes/auth.js` exists but is not currently mounted in `server.js`.  
If you want frontend social login calls to work, mount it:

```js
app.use("/api/auth", require("./routes/auth"));
```

Also ensure redirect URLs in `routes/auth.js` match your frontend URL (currently `http://localhost:5173`).
