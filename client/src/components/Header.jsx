import { useContext } from "react"
import { Button, Container, Navbar } from "react-bootstrap"
import { Link, useNavigate } from "react-router"

import UserContext from "../contexts/UserContext"

function Header() {

  const user = useContext(UserContext)

  const destination = user.id ? "/game/setup" : "/"

  return (
    <Navbar style={{ backgroundColor: "#f5ebe0" }}>
      <Container fluid>
        <h1><Link to={destination} style={{ color: "black", textDecoration: "none" }}>Last Race in Madrid</Link></h1>
        <div>{user.name ? <UserInfo name={user.name} /> : <LoginButton />}</div>
      </Container>
    </Navbar>
  )
}

function LoginButton(props) {
  const navigate = useNavigate()

  return <Button variant = "light" style={{ backgroundColor: "#b08968"}} onClick={() => navigate('/login')}>Log In</Button>
}

function UserInfo(props) {
  return <div>
    <div>{props.name}</div>
    <div><Link to='/logout'>Logout</Link></div>
  </div>
}

export default Header
