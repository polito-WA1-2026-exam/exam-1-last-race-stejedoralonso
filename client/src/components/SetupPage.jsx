import { Button } from "react-bootstrap"
import { useNavigate } from "react-router"

import { createGame } from "../api/api"
import networkMap from "../assets/network-map.jpeg"

function SetupPage() {

  const navigate = useNavigate()

  // Create a new game and navigate to the planning phase
  const handleStartGame = async () => {
    const game = await createGame()
    navigate("/game/planning", { state: { gameId: game.gameId, startStation: game.startStation, endStation: game.endStation} })
  }

  return <>
    <h2>Network Map</h2>
    <p>Study the network before starting. You will need to plan your route from memory!</p>
    <img src={networkMap} alt="Madrid Metro network map" style={{ width: "100%" }} />
    <Button variant="success" onClick={handleStartGame}>Ready!</Button>
  </>
}

export default SetupPage
