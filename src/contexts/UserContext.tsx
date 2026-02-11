import React, { createContext, useContext, useState, useEffect } from "react";
import { logger } from "@/utils/logger";

interface User {
  id: string;
  walletAddress: string;
  username?: string;
  profilePicture?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  login: (walletAddress: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        logger.error("Error parsing saved user:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const login = (walletAddress: string) => {
    const newUser: User = {
      id: walletAddress, // Use wallet address as ID for now
      walletAddress,
      username: undefined,
      profilePicture: undefined,
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const value: UserContextType = {
    user,
    setUser,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
