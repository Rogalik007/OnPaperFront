import { useState, SubmitEvent } from 'react'
import { useNavigate, Link } from "react-router";
import { API_URL } from '../../../config.js'
import { saveAuth } from '../../models/Auth.tsx'

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  let navigate = useNavigate();

  const handleLogin = async (e: SubmitEvent) => {
    e.preventDefault();

    setError(null);

    try {
      const response = await fetch(`${ API_URL }/login`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        saveAuth(data.id, data.token);
        navigate("/");
      } else {
        setError(data || "An unknown error occurred. Please try again.");
      }
    } catch (error) {
      setError("Unable to connect to the server. Please try again later.");
    }
  };

  return (
    <>
      <form onSubmit={ handleLogin } method="post">
        <h1>Log In</h1>

        { error && <p className="error" id="error">{ error }</p> }

        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" value={ email } onChange={ (e) => setEmail(e.target.value) } required />

        <label htmlFor="password">Password</label>
        <input type="password" id="password" name="password" value={ password } onChange={ (e) => setPassword(e.target.value) } required />

        <button type="submit">Log In</button>

        <p>No account? <Link to="/register">Sign up</Link></p>
      </form>
    </>
  )
}

export default Login
