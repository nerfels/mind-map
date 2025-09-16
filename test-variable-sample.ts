
// Test file for variable tracking
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://api.example.com';
export const DEFAULT_TIMEOUT = 5000;

interface User {
  id: number;
  name: string;
  email: string;
}

export class UserService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async fetchUser(userId: number): Promise<User | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/users/${userId}`, {
        timeout: this.timeout
      });

      if (response.data) {
        const user: User = response.data;
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  }

  updateUser(user: User): Promise<boolean> {
    const config = { timeout: this.timeout };
    return axios.put(`${this.baseUrl}/users/${user.id}`, user, config)
      .then(response => response.status === 200)
      .catch(() => false);
  }
}

export function useUserData(userId: number) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const userService = new UserService();
        const userData = await userService.fetchUser(userId);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  return { user, loading, error };
}

// Some unused variables for testing
const UNUSED_CONSTANT = 'This is not used';
let unusedVariable = 42;
const unusedFunction = () => console.log('never called');
