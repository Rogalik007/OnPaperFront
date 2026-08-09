import { useState, SubmitEvent } from 'react'
import { useNavigate, Link } from "react-router";
import { API_URL } from '../../../config.js'
import { saveAuth } from '../../models/Auth.tsx'
import './Auth.css'

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  let navigate = useNavigate();

  const handleRegister = async (e: SubmitEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm ) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password.length > 64) {
      setError("Password must be no more than 64 characters long");
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${ API_URL }/register`, {
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
    }
    catch (error) {
      setError("Unable to connect to the server. Please try again later.");
    }
  };

  return (
    <>
      <form onSubmit={ handleRegister } method="post">
        <h1>Sign Up</h1>

        { error && <p className="error" id="error" >{ error }</p> }

        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" value={ email } onChange={ (e) => setEmail(e.target.value) } required />

        <label htmlFor="password">Password</label>
        <input type="password" id="password" name="password" value={ password } onChange={ (e) => setPassword(e.target.value) } required />

        <label htmlFor="confirm-password">Confirm password</label>
        <input type="password" id="confirm-password" name="confirm-password" value={ passwordConfirm } onChange={ (e) => setPasswordConfirm(e.target.value) } required />

        <button type="submit">Create account</button>

        <p>Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </>
  )
}

export default Register
