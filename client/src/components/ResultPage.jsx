import { useState } from "react"
import { Button, Table, Row, Col } from "react-bootstrap"
import { useLocation, useNavigate } from "react-router"

function ResultPage() {

  const navigate = useNavigate()
  const location = useLocation()

  const { result, startStation, endStation } = location.state

  // How many steps are shown
  const [visibleSteps, setVisibleSteps] = useState(0)

  // Show one more step
  const handleNextStep = () => {
    setVisibleSteps(prev => prev + 1)
  }

  const allRevealed = visibleSteps >= result.steps.length

  return <>

    <Row className="mb-3">
      <Col>
        <h2>{result.valid ? "Execution" : "Route Invalid"}</h2>
      </Col>
      <Col style={{ textAlign: "right" }}>
        <h3>Starting coins: 20</h3>
      </Col>
    </Row>

    {!result.valid
      ? <p>{result.reason} You lose all your coins.</p>
      : <>
          <p>
            <strong>Route:</strong> {startStation.name} → {endStation.name}
          </p>

          {visibleSteps > 0 &&
            <Table striped>
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Event</th>
                  <th>Effect</th>
                  <th>Coins</th>
                </tr>
              </thead>
              <tbody>
                {result.steps.slice(0, visibleSteps).map((step, index) =>
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{step.from.name}</td>
                    <td>{step.to.name}</td>
                    <td>{step.event.description}</td>
                    <td style={{ color: step.event.effect >= 0 ? "green" : "red" }}>
                      {step.event.effect >= 0 ? "+" : ""}{step.event.effect}
                    </td>
                    <td>{step.coinsAfter}</td>
                  </tr>
                )}
              </tbody>
            </Table>
          }

          {!allRevealed &&
            <Button variant="primary" onClick={handleNextStep}>
              Next step ({visibleSteps + 1}/{result.steps.length})
            </Button>
          }
        </>
    }

    {(allRevealed || !result.valid) &&
      <div style={{ marginTop: "20px" }}>
        <h3>Final score: {result.finalScore} coins</h3>
        <Button variant="success" onClick={() => navigate("/game")} style={{ marginRight: "10px" }}>
          Play again
        </Button>
        <Button variant="outline-secondary" onClick={() => navigate("/ranking")}>
          See ranking
        </Button>
      </div>
    }
  </>
}

export default ResultPage
