/*Data Access Object*/

import sqlite from 'sqlite3';
import crypto from 'crypto';
import dayjs from 'dayjs';

const db = new sqlite.Database('madrid_metro.sqlite', (err) => {
  if (err) throw err;
});

/* ── USERS ─────────────────────────────────────────────────────────── */

export const getUser = (email, password) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => {
      if (err) { 
        reject(err); 
      }
      else if (row === undefined) { 
        resolve(false); 
    }
      else {
        const user = { id: row.id, name: row.name, email: row.email };
        crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
          if (err) reject(err);
          if (!crypto.timingSafeEqual(Buffer.from(row.password, 'hex'), hashedPassword))
            resolve(false);
          else
            resolve(user);
        });
      }
    });
  });
};

/* ── NETWORK ───────────────────────────────────────────────────────── */

// Returns the full network: lines (with ordered stations) + all unique segments.
export const getNetwork = () => {
  return new Promise((resolve, reject) => {
    // Load every (line, station, position) row, joined with names
    const sql = `
      SELECT l.id AS lineId, l.name AS lineName, l.color,
             s.id AS stationId, s.name AS stationName,
             ls.position
      FROM line_stations ls
      JOIN lines    l ON l.id = ls.line_id
      JOIN stations s ON s.id = ls.station_id
      ORDER BY l.id, ls.position
    `;
    db.all(sql, [], (err, rows) => {
        if (err) { 
            reject(err)
        }
        else {
            // Build lines map
            const linesMap = {};
            for (const row of rows) {
                if (!linesMap[row.lineId]) {
                    // Initialise line entry on first encounter
                    linesMap[row.lineId] = {
                        id: row.lineId,
                        name: row.lineName,
                        color: row.color,
                        stations: [],   // ordered list of { id, name }
                    };
                }
                // Append station to line's stations list (order guaranteed by SQL query)
                linesMap[row.lineId].stations.push({ id: row.stationId, name: row.stationName });
            }

            // Discard the numeric keys, we only need the array of line objects.
            const lines = Object.values(linesMap);

            // Build the list of segments
            // Every consecutive pair (stations[i], stations[i+1]) on a line is one segment.
            const segments = [];
            for (const line of lines) {
                for (let i = 0; i < line.stations.length - 1; i++) {
                    segments.push({ stationA: line.stations[i], stationB: line.stations[i + 1] });
                }
            }
        
            // Build stations list 
            // stationId as key so each station appears only once even if it belongs to several lines.
            const stationsMap = {};
            for (const row of rows) {
                stationsMap[row.stationId] = { id: row.stationId, name: row.stationName };
            }
            // Discard the numeric keys, we only need the array of station objects
            const stations = Object.values(stationsMap);
        
            resolve({ lines, stations, segments });
        }    
    });
  });
};

/* ── GAMES ─────────────────────────────────────────────────────────── */
 
// Pick a random pair (start, end) that are at least minSegments apart in the network.
// Returns {startStation, endStation} objects with {id, name}.
export const pickStartEnd = (minSegments = 3) => {
  return new Promise((resolve, reject) => {
    // Load adjacency: each row is one directed edge (both directions needed)
    const sql = `
      SELECT s1.id AS aId, s1.name AS aName,
             s2.id AS bId, s2.name AS bName
      FROM line_stations ls1
      JOIN line_stations ls2 ON ls1.line_id = ls2.line_id
                             AND ls2.position = ls1.position + 1
      JOIN stations s1 ON s1.id = ls1.station_id
      JOIN stations s2 ON s2.id = ls2.station_id
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            reject(err)
        } else {
            // Build adjacency list (undirected)
            const adj = {};           // stationId -> Set of neighbouring stationIds
            const stationNames = {};  // stationId -> name
            for (const row of rows) {
                stationNames[row.aId] = row.aName;
                stationNames[row.bId] = row.bName;
                // Initialise adjacency set on first encounter
                if (!adj[row.aId]) adj[row.aId] = new Set(); 
                if (!adj[row.bId]) adj[row.bId] = new Set();
                // Add both directions since the graph is undirected
                adj[row.aId].add(row.bId);
                adj[row.bId].add(row.aId);
            }
      
            const stationIds = Object.keys(adj).map(Number); 
 
            // Breadth-First Search to compute the minimum distance from a given start station to all reachable stations.
            // It returns a map: stationId -> distance (in segments) from the start station.
            const bfsearch = (start) => {
                const dist = { [start]: 0 }; // Distance from itself is always zero
                const queue = [start]; // List of stations we still need to explore 
                while (queue.length) {
                    const current = queue.shift(); 
                    for (const neighbour of adj[current]) { 
                        if (dist[neighbour] === undefined) { // Just the shortest path is needed
                            dist[neighbour] = dist[current] + 1;
                            queue.push(neighbour);
                        }
                    }
                }
                return dist;
            };
 
            // Collect all pairs of stations with distance >= minSegments
            const candidates = [];
            for (const startId of stationIds) {
                const dist = bfsearch(startId);
                for (const [endIdStr, d] of Object.entries(dist)) {
                    const endId = Number(endIdStr);
                    if (d >= minSegments) {
                        candidates.push({ startId, endId, distance: d });
                }
                }
            }
      
            // Check that the network is not too small for the given minSegments constraint
            if (candidates.length === 0) {
                reject(new Error('No valid start/end pair found'));
            }
            else {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                resolve({
                    startStation: { id: pick.startId, name: stationNames[pick.startId] },
                    endStation:   { id: pick.endId,   name: stationNames[pick.endId] },
                });
            }
        }
    });
  });
};
 
// Create a new game row (score and played_at are NULL until submission)
    export const createGame = (userId, startStationId, endStationId) => {
    return new Promise((resolve, reject) => {
        const sql = `
        INSERT INTO games (user_id, start_station_id, end_station_id)
        VALUES (?, ?, ?)
        `;
        db.run(sql, [userId, startStationId, endStationId], function (err) {
        if (err) reject(err);
        // this.lastID contains the id of the newly created row
        else resolve(this.lastID);
        });
    });
    };
 
// Retrieves a game by id (used by the server during route submission to validate ownership and load start/end stations)
export const getGame = (gameId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT g.id, g.user_id, g.score, g.played_at,
             s1.id AS startId, s1.name AS startName,
             s2.id AS endId,   s2.name AS endName
      FROM games g
      JOIN stations s1 ON s1.id = g.start_station_id
      JOIN stations s2 ON s2.id = g.end_station_id
      WHERE g.id = ?
    `;
    db.get(sql, [gameId], (err, row) => {
      if (err){
        reject(err);
      } 
      else if (row === undefined){
        resolve(null); 
      } 
      else{
        resolve({
        id: row.id,
        userId: row.user_id,
        score: row.score,
        playedAt: row.played_at,
        startStation: { id: row.startId, name: row.startName },
        endStation:   { id: row.endId,   name: row.endName },
      });
      }
        
    });
  });
};
 
// Persist the final score (called after route validation + execution)
export const saveGameResult = (gameId, score) => {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE games
      SET score = ?, played_at = ?
      WHERE id = ?
    `;
    const now = dayjs().format();
    db.run(sql, [score, now, gameId], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};
 
/* ── EVENTS ────────────────────────────────────────────────────────── */
 
// Returns all events (used by the server to pick randomly during execution)
export const getAllEvents = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT description, effect FROM events';
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};
 
/* ── RANKING ───────────────────────────────────────────────────────── */
 
// Best score per user, for all users who have completed at least one game.
// Returns [{name, bestScore}] sorted descending.
export const getRanking = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT u.name, MAX(g.score) AS bestScore
      FROM games g
      JOIN users u ON u.id = g.user_id
      WHERE g.score IS NOT NULL
      GROUP BY g.user_id
      ORDER BY bestScore DESC
    `;
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};