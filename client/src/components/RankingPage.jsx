import { useState, useEffect } from "react"
import { Table } from "react-bootstrap"

import { getRanking } from "../api/api"

function RankingPage() {

    const [ranking, setRanking] = useState([])
    const [waiting, setWaiting] = useState(true)

    useEffect(() => {
        setWaiting(true)
        getRanking()
            .then(ranking => {
                setRanking(ranking)
                setWaiting(false)
            })
    }, [])

    if (waiting)
        return <h2>Loading ranking...</h2>

    return <>
        <h2>Ranking</h2>
        <Table striped>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Best Score</th>
                </tr>
            </thead>
            <tbody>
                {ranking.map((r, index) =>
                    <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{r.name}</td>
                        <td>{r.bestScore}</td>
                    </tr>
                )}
            </tbody>
        </Table>
    </>
}

export default RankingPage
