import { useState, useEffect } from "react"
import { Form, Button, Container } from "react-bootstrap"
import { useNavigate } from "react-router"

import { doLogin, doLogout } from "../api/auth"

function LoginForm(props) {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [errormsg, setErrormsg] = useState("")

  const doSubmit = async (ev) => {
    ev.preventDefault()
    setErrormsg("")

    try {
      const user = await doLogin(email, password)
      props.handleLogin(user)
    } catch (ex) {
      setErrormsg(ex.message)
      setTimeout(() => setErrormsg(""), 3000)
    }
  }

  return (
    <Container>
      <h2>Please login</h2>

      <Form onSubmit={doSubmit}>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" placeholder="Enter email" value={email} onChange={(ev) => setEmail(ev.target.value)} />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" placeholder="Password" value={password} onChange={(ev) => setPassword(ev.target.value)} />
        </Form.Group>
        <Button variant="primary" type="submit">
          Log in
        </Button> {errormsg && <div className="text-danger">{errormsg}</div>}
      </Form>
    </Container>
  )
}

function Logout(props) {
  const navigate = useNavigate()

  useEffect(() => {
    doLogout().then(() => {
      props.handleLogout()
      navigate("/")
    })
  }, [])

  return "Logging out..."
}

export { LoginForm, Logout }
