
import React, { useState } from 'react';
import { db } from '../db';

interface Props {
  children: React.ReactNode;
  title: string;
}

const AdminWrapper: React.FC<Props> = ({ children, title }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    const settings = db.getSettings();
    if (password === settings.mastersPasswordHash) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Invalid master password');
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto mt-20 p-8 ms-bg-card rounded-lg ms-shadow border ms-border text-center">
      <div className="mb-6">
        <div className="w-16 h-16 ms-bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
        <p className="text-gray-500 text-sm">Please enter the Master Password to access {title}</p>
      </div>

      <div className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter Password"
          className="w-full px-4 py-2 border ms-border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          onClick={handleVerify}
          className="w-full ms-bg-primary text-white py-2 rounded font-semibold hover:bg-blue-600 transition-colors"
        >
          Unlock Settings
        </button>
      </div>
    </div>
  );
};

export default AdminWrapper;
