import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { API_URL } from '../../../config.js';

function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Confirmation link is missing a token.');
      setStatus('error');
      return;
    }

    let isCurrent = true;

    fetch(`${API_URL}/confirm-email`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then(async response => {
        if (!isCurrent) {
          return;
        }

        if (response.ok) {
          setStatus('success');
        } else {
          const data = await response.json().catch(() => null);
          setError(data || 'Unable to confirm email.');
          setStatus('error');
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError('Unable to connect to the server. Please try again later.');
          setStatus('error');
        }
      });

    return () => { isCurrent = false; };
  }, [token]);

  return (
    <div className="game-message">
      { status === 'pending' && <p>Confirming your email...</p> }
      { status === 'success' && (
        <>
          <h2>Email confirmed</h2>
          <p>Your account is ready. You can now log in.</p>
          <Link to="/login">Go to login</Link>
        </>
      ) }
      { status === 'error' && (
        <>
          <h2>Confirmation failed</h2>
          <p className="error">{ error }</p>
          <Link to="/login">Back to login</Link>
        </>
      ) }
    </div>
  );
}

export default ConfirmEmail;
