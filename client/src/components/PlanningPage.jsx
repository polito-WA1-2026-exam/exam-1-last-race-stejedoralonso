import { useState, useEffect } from "react"
import { Button, ListGroup, Row, Col } from "react-bootstrap"
import { useLocation, useNavigate } from "react-router"

import { getNetwork, submitRoute } from "../api/api"
import stationsMap from "../assets/stations-map.jpeg"

function PlanningPage() {

  const navigate = useNavigate()
  const location = useLocation()

  // Data received from SetupPage via navigate state
  const { gameId, startStation, endStation } = location.state

  // Network data fetched from server
  const [network, setNetwork] = useState(null)

  // 90s timer (starts only after network is loaded)
  const [timeLeft, setTimeLeft] = useState(90)

  // Route built by the player: array of { stationA: id, stationB: id }
  const [route, setRoute] = useState([])

  // Flag to prevent double submission
  const [submitted, setSubmitted] = useState(false)

  // Fetch network on mount
  useEffect(() => {
    getNetwork().then(network => {
      // Get the segments in a random order
      network.segments.sort(() => Math.random() - 0.5)
      setNetwork(network)
    })
  }, [])

  // Timer: starts only when network is loaded
  useEffect(() => {
    if (!network) return

    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalId)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    // Effect clean up
    return () => clearInterval(intervalId)
  }, [network])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft <= 0 && !submitted) {
      doSubmit()
    }
  }, [timeLeft])

  const doSubmit = () => {
    setSubmitted(true)
    submitRoute(gameId, route).then(result => {
      navigate("/game/result", { state: { result, startStation, endStation } })
    })
  }

  // Add a segment to the route
  const handleSelectSegment = (segment) => {
    setRoute(prev => [...prev, segment])
  }

  // Remove last segment from the route
  const handleUndoLast = () => {
    setRoute(prev => prev.slice(0, -1))
  }

  // Check if a segment is already in the route
  const isSegmentUsed = (segment) => {
    return route.some(r =>
      (r.stationA === segment.stationA.id && r.stationB === segment.stationB.id) ||
      (r.stationA === segment.stationB.id && r.stationB === segment.stationA.id)
    )
  }

  // Show loading while fetching network
  if (!network){
    return <h2>Loading...</h2>
  }    

  return <>
    <h2>Planning Phase</h2>

    <div>
      <img src={stationsMap} alt="Madrid Metro stations map" style={{ width: "100%" }} />
    </div>

    <Row className="mb-3">
      <Col>
        <p>
          <strong>From:</strong> {startStation.name} →
          <strong> To:</strong> {endStation.name}
        </p>
      </Col>
      <Col style={{ textAlign: "right" }}>
        <h3 style={{ color: timeLeft <= 10 ? "red" : "black" }}>
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </h3>
      </Col>
    </Row>

    <Row>
      <Col md={6}>
        <h4>Available segments</h4>
        <ListGroup>
          {network.segments.map((seg, index) =>
            <ListGroup.Item
              key={index}
              action
              disabled={isSegmentUsed(seg)}
              style={isSegmentUsed(seg) ? { textDecoration: "line-through", color: "lightgray" } : {}}
              onClick={() => handleSelectSegment({ stationA: seg.stationA.id, stationB: seg.stationB.id })}
            >
              {seg.stationA.name} ↔ {seg.stationB.name}
            </ListGroup.Item>
          )}
        </ListGroup>
      </Col>

      <Col md={6}>
        <h4>Your route</h4>
        {route.length === 0
          ? <p>No segments selected yet.</p>
          : <ListGroup>
              {route.map((seg, index) => {
                // Find station names from the network
                const nameA = network.stations.find(s => s.id === seg.stationA)?.name
                const nameB = network.stations.find(s => s.id === seg.stationB)?.name
                return (
                  <ListGroup.Item key={index}>
                    {index + 1}. {nameA} — {nameB}
                  </ListGroup.Item>
                )
              })}
            </ListGroup>
        }
        <div style={{ marginTop: "10px" }}>
          <Button variant="warning" onClick={handleUndoLast} disabled={route.length === 0} style={{ marginRight: "10px" }}>
            Undo last
          </Button>
          <Button variant="success" onClick={doSubmit} disabled={submitted}>
            Submit route
          </Button>
        </div>
      </Col>
    </Row>
  </>
}

export default PlanningPage
