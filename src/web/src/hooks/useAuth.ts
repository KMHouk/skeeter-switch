import { useCallback, useEffect, useState } from 'react';
import { fetchUserInfo } from '../api/client';
import { UserInfo } from '../types';

interface UseAuthResult {
  user: UserInfo | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthResult => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await fetchUserInfo();
      setUser(info);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const isAuthenticated = Boolean(user?.clientPrincipal);
  const isAdmin = user?.clientPrincipal?.userRoles.includes('admin') ?? false;

  return { user, isLoading, isAdmin, isAuthenticated };
};
