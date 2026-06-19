async function getNetwork() {
    try {
        const response = await fetch("http://localhost:3001/api/network", {
            credentials: "include"
        });

        if (response.ok) {
            const network = await response.json();
            return network;
        } else {
            // 4xx or 5xx status code
            throw new Error("HTTP error in getNetwork, code=" + response.status);
        }
    } catch (e) {
        // handle network errors + parsing errors
        throw new Error("Network error in getNetwork", { cause: e });
    }
}

async function createGame() {
    try {
        const response = await fetch("http://localhost:3001/api/games", {
            method: "POST",
            credentials: "include"
        });

        if (response.ok) {
            const game = await response.json();
            return game;
        } else {
            throw new Error("HTTP error in createGame, code=" + response.status);
        }
    } catch (e) {
        throw new Error("Network error in createGame", { cause: e });
    }
}

async function submitRoute(gameId, segments) {
    try {
        const response = await fetch(`http://localhost:3001/api/games/${gameId}/route`, {
            method: "POST",
            body: JSON.stringify({ segments: segments }),
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        if (response.ok) {
            const result = await response.json();
            return result;
        } else {
            throw new Error("HTTP error in submitRoute, code=" + response.status);
        }
    } catch (e) {
        throw new Error("Network error in submitRoute", { cause: e });
    }
}

async function getRanking() {
    try {
        const response = await fetch("http://localhost:3001/api/ranking", {
            credentials: "include"
        });

        if (response.ok) {
            const ranking = await response.json();
            return ranking;
        } else {
            throw new Error("HTTP error in getRanking, code=" + response.status);
        }
    } catch (e) {
        throw new Error("Network error in getRanking", { cause: e });
    }
}

export { getNetwork, createGame, submitRoute, getRanking };