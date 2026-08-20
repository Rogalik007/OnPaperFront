import { useEffect, useState } from 'react';
import './Leaderboard.css';
import { API_URL } from '../../../config.js';

interface RatingEntry {
  email: string;
  score: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<RatingEntry[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    fetch(`${API_URL}/ratings/top`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load leaderboard');
        }

        return response.json();
      })
      .then((data: RatingEntry[]) => {
        if (isCurrent) {
          setEntries(data);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError(true);
        }
      });

    return () => { isCurrent = false; };
  }, []);

  if (error || entries.length === 0) {
    return null;
  }

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          { entries.map((entry, index) => (
            <tr key={ entry.email }>
              <td>{ index + 1 }</td>
              <td>{ entry.email }</td>
              <td>{ entry.score }</td>
            </tr>
          )) }
        </tbody>
      </table>
    </div>
  );
}
