// imports
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { getUser, getNetwork, pickStartEnd, createGame, getGame, saveGameResult, getAllEvents, getRanking } from "./dao.js";
import { check, validationResult } from "express-validator";

import passport from "passport";
import LocalStrategy from "passport-local";
import session from "express-session";


// init express
const app = new express();
const port = 3001;

app.use(express.json());
app.use(morgan("dev"));

const corsOptions = {
  origin: 'http://localhost:5173',
  optionsSuccessStatus: 200,
  credentials: true,             // allows cookies to be sent cross-origin
};
app.use(cors(corsOptions));

passport.use(new LocalStrategy(async function verify(username, password, cb) {
  const user = await getUser(username, password);
  if (!user)
    return cb(null, false, "Incorrect username or password.");
  return cb(null, user);
}));

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (user, cb) {
  return cb(null, user);
});


// isLoggedIn middleware
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) // checks the req.user corresponds to an id of a user that has been authenticated and is still logged in
    return next();
  return res.status(401).json({ error: "Not authorized" });
};

app.use(session({
  secret: "shhhhh... it's a secret!",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate("session"));

/* --- AUTH ROUTES ------------------------------------------------------------ */

// POST /api/sessions --> login
app.post("/api/sessions", passport.authenticate("local"), (req, res) => {
  return res.status(201).json(req.user);
});

// GET /api/sessions/current --> check if still logged in
app.get("/api/sessions/current", (req, res) => {
  if (req.isAuthenticated())
    res.json(req.user);
  else
    res.status(401).json({error: "Not authenticated"});
});

// DELETE /api/sessions/current --> logout
// It actually does not destroy the cookie, but it removes the authentication session from the server memory, so the cookie is no longer valid.
app.delete("/api/sessions/current", (req, res) => {
  req.logout(() => {
    res.end();
  });
});

// All routes below this line require authentication
app.use(isLoggedIn);

/* --- NETWORK ROUTES -------------------------------------------------------------- */
 
// GET /api/network
app.get("/api/network", async (req, res) => {
  try {
    const network = await getNetwork();
    res.json(network);
  } catch {
    res.status(500).json({ error: "Cannot retrieve the network." });
  }
});


/* -- GAME ROUTES ------------------------------------------------------------------------ */
 
// POST /api/games
// Auth required. Creates a new game: server randomly picks start/end stations
// Returns { gameId, startStation, endStation }.
app.post("/api/games", async (req, res) => {
  try {
    const { startStation, endStation } = await pickStartEnd();
    const gameId = await createGame(req.user.id, startStation.id, endStation.id);
    res.status(201).json({ gameId, startStation, endStation });
  } catch {
    res.status(503).json({ error: "Cannot create a new game." });
  }
});
 
// POST /api/games/:id/route

// Auth required. The client submits the planned route as an ordered list of segment objects: [{ stationA: id, stationB: id }, ...].
// The server validates the route and returns { valid, steps, finalScore } where steps = [{ from, to, event, coinsAfter }].
app.post("/api/games/:id/route",
  [
    check("id").isInt({ min: 1 }), 
    check("segments").isArray(),
    check("segments.*.stationA").isInt({ min: 1 }),//
    check("segments.*.stationB").isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req); 
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
 
    const gameId = Number(req.params.id); 
    const submittedSegments = req.body.segments; 
 
    try {
      //Load game, validates it exists, belongs to the user and is not yet played.
      const game = await getGame(gameId);
      if (!game)
        return res.status(404).json({ error: "Game not found." });
      if (game.userId !== req.user.id)
        return res.status(403).json({ error: "Forbidden." });
      if (game.score !== null)
        return res.status(409).json({ error: "Game already played." });

      // Helper: mark the route as invalid, save score = 0, and respond
      const failRoute = async (reason) => {
        await saveGameResult(gameId, 0);
        return res.json({ valid: false, reason, steps: [], finalScore: 0 });
      };

      //Empty route submitted
      if (submittedSegments.length === 0) {
        await failRoute("No segments submitted")
      }
 
      // Load network for validation
      const { lines, stations, segments: networkSegments } = await getNetwork();
 
      // Set of valid segment keys for existence checking
      const validSegments = new Set(
        networkSegments.map(seg =>
          `${Math.min(seg.stationA.id, seg.stationB.id)}-${Math.max(seg.stationA.id, seg.stationB.id)}`
        )
      );
 
      // Station names for response
      const stationNames = {};
      for (const station of stations)
        stationNames[station.id] = station.name;

 
      // Build the ordered station sequence from the segments taking into account that segments can be in either direction.
      const stationSequence = [];
      for (let i = 0; i < submittedSegments.length; i++) {
        const seg = submittedSegments[i];
        if (i === 0) {
          if (seg.stationA === game.startStation.id) {
            stationSequence.push(seg.stationA, seg.stationB);
          } else if (seg.stationB === game.startStation.id) {
            stationSequence.push(seg.stationB, seg.stationA);
          } else {
            return await failRoute("First segment does not include the starting station.");
          }
        } else {
          const prev = stationSequence[stationSequence.length - 1];
          if (seg.stationA === prev) {
            stationSequence.push(seg.stationB);
          } else if (seg.stationB === prev) { 
            stationSequence.push(seg.stationA);
          } else {
            return await failRoute("Segments are not connected in sequence.");
          }
        }
      }
 
      // Check start and end stations
      if (stationSequence[0] !== game.startStation.id) 
        return await failRoute("Route does not start at the assigned starting station.");
      if (stationSequence[stationSequence.length - 1] !== game.endStation.id)
        return await failRoute("Route does not end at the assigned destination.");
 
      // Check each segment exists in the network and no segment is repeated
      const usedSegments = new Set();
      for (const seg of submittedSegments) {
        const key = `${Math.min(seg.stationA, seg.stationB)}-${Math.max(seg.stationA, seg.stationB)}`;
        if (!validSegments.has(key))
          return  await failRoute(`Segment ${seg.stationA}-${seg.stationB} does not exist in the network.`);
        if (usedSegments.has(key))
          return await failRoute(`Segment ${seg.stationA}-${seg.stationB} is repeated in the route.`);
        usedSegments.add(key);
      }

      // Execute route: apply a random event per segment and save the final score. 
      const allEvents = await getAllEvents();
      let coins = 20;
      const steps = [];
 
      for (let i = 0; i < submittedSegments.length; i++) {
        const seg = submittedSegments[i];
        const fromId = stationSequence[i];
        const toId   = stationSequence[i + 1];
        const event  = allEvents[Math.floor(Math.random() * allEvents.length)];
        coins += event.effect;
        steps.push({
          from:       { id: fromId, name: stationNames[fromId] },
          to:         { id: toId,   name: stationNames[toId] },
          event:      { description: event.description, effect: event.effect },
          coinsAfter: coins,
        });
      }
 
      // If the final score is negative, it will be stored and shown as 0.
      const finalScore = Math.max(0, coins);
      await saveGameResult(gameId, finalScore);
 
      res.json({ valid: true, steps, finalScore });

    } catch (e) {
      console.error(e);
      res.status(503).json({ error: "Cannot process the route." });
    }
  }
);
 
/* -- RANKING ROUTE ---------------------------------------------------- */
 
// GET /api/ranking
// Auth required. Returns [{ name, bestScore }] sorted descending.
app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await getRanking();
    res.json(ranking);
  } catch {
    res.status(500).json({ error: "Cannot retrieve the ranking." });
  }
});

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});