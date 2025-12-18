import React, { useState } from 'react';

interface LoginProps {
  onLogin: (adminStatus: boolean, isSuperAdmin?: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response status:', response.status);
      console.log('Login response data keys:', Object.keys(data));
      console.log('Login response:', { ...data, token: data.token ? data.token.substring(0, 20) + '...' : 'NO TOKEN' });
      
      if (response.ok) {
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('isAdmin', data.isAdmin.toString());
          localStorage.setItem('isSuperAdmin', (data.isSuperAdmin || false).toString());
          console.log('✓ Token saved to localStorage:', data.token.substring(0, 20) + '...');
          console.log('✓ Stored token verified:', localStorage.getItem('authToken')?.substring(0, 20) + '...');
          onLogin(data.isAdmin, data.isSuperAdmin);
        } else {
          setError('Login failed: No token received from server');
          console.error('✗ No token in login response. Keys:', Object.keys(data));
        }
      } else {
        console.error('✗ Login failed with status:', response.status);
        setError(data.error || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-brand-background">
      <div className="w-full max-w-sm p-8 space-y-6 bg-brand-surface border border-brand-border rounded-xl shadow-sm">
        <div className="text-center mb-6 flex justify-center">
          <img src="/logo.png" alt="Naturals Logo" className="h-20" />
        </div>
        <h1 className="text-2xl font-bold text-center text-brand-text-primary">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          <div>
            <button type="submit" disabled={isLoading} className="w-full py-3 font-semibold text-white transition-colors bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to rounded-lg shadow-sm hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed">
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
