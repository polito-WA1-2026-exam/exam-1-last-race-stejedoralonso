import "bootstrap/dist/css/bootstrap.min.css"

import { useState, useEffect, useContext } from 'react'
import { Container, Button } from 'react-bootstrap'
import { Outlet, Route, Routes, useNavigate, Link } from 'react-router'

import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import { LoginForm, Logout } from "./components/LoginForm.jsx"
import RankingPage from "./components/RankingPage.jsx"
import SetupPage from "./components/SetupPage.jsx"
import PlanningPage from "./components/PlanningPage.jsx"
import ResultPage from "./components/ResultPage.jsx"

import UserContext from './contexts/UserContext.js'

import { checkSession } from './api/auth.js'

function App() {
  

  const navigate = useNavigate()

  // It starts with an anonymous user
  const [user, setUser] = useState({ id: undefined, email: undefined, name: undefined })

  // Try to restore the login session
  useEffect(() => {
    checkSession().then(result => {
      if (result) {
        setUser({ id: result.id, email: result.email, name: result.name })
      }
    })
  }, [])

  // Login action handler
  const handleLogin = (newUser) => {
    setUser({ id: newUser.id, email: newUser.email, name: newUser.name })
    navigate("/")
  }

  // Logout action handler
  const handleLogout = () => {
    setUser({ id: undefined, email: undefined, name: undefined })
  }

  return (
  <UserContext.Provider value={user}>
        <Container>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<LoginForm handleLogin={handleLogin} />} />
              <Route path="logout" element={<Logout handleLogout={handleLogout} />} />
              <Route path="ranking" element={<RankingPage />} />
              <Route path="game" element={<SetupPage />} />
              <Route path="game/planning" element={<PlanningPage />} />
              <Route path="game/result" element={<ResultPage />} />
              <Route path="*" element={<h1>Page not found</h1>} />
            </Route>
          </Routes>
        </Container>
      </UserContext.Provider>
    )
  }
  
  // Layout: Header + page content + Footer (always rendered)
  function MainLayout() {
    return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <div> 
        <Outlet />
      </div>
      <Footer />
    </div>
  }
  
  // Landing page for anonymous users
  function LandingPage() {
    const user = useContext(UserContext)
    const navigate = useNavigate()
  
    return <>
      <h2>How to play</h2>
      <p>
        You will be assigned a starting station and a destination station
        in the Madrid Metro network. Your goal is to plan a valid route
        between them and reach the destination with the highest possible score.
      </p>
      <h3>Game phases</h3>
      <ol>
        <li>
          <strong>Setup:</strong> The full network map with all stations,
          connections and metro lines will be displayed. When you are ready, start the game.
        </li>
        <li>
          <strong>Planning:</strong> You have 90 seconds to build your route
          by selecting segments from the list.
        </li>
        <li>
          <strong>Execution:</strong> Your route is validated and, for each
          segment, a random event occurs that adds or removes coins.
        </li>
        <li>
          <strong>Result:</strong> Your final score is the number of coins
          remaining.
        </li>
      </ol>
      <p>Each game starts with <strong>20 coins</strong>.</p>
      {user.id
      ? <Button variant="success" onClick={() => navigate("/game")}>Start playing!</Button>
      : <Button variant="primary" onClick={() => navigate("/login")}>Log in to play!</Button>
    }
    </>
}
      
export default App
