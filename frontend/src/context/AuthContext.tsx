import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import axios from 'axios';
import { setAuthToken, apiService } from '../services/api';
import { type Profile, type RegisterProfileData } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidas no .env.local');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  register: (email: string, password: string, profileData: RegisterProfileData) => Promise<void>;
  completeProfile: (profileData: RegisterProfileData) => Promise<Profile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (): Promise<Profile> => {
    try {
      const data = await apiService.getProfileMe();
      const fetched = data as Profile;
      setProfile(fetched);
      return fetched;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setProfile(null);
        throw new Error('PROFILE_NOT_FOUND', { cause: error });
      }
      throw error;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setUser(session.user);
          setAuthToken(session.access_token);
          try {
            await fetchProfile();
          } catch {
            // PROFILE_NOT_FOUND is expected for newly registered users awaiting profile setup
          }
        } else {
          setUser(null);
          setProfile(null);
          setAuthToken(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<Profile> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error('Erro ao criar sessão de autenticação.');

    setUser(data.user);
    setAuthToken(data.session.access_token);

    try {
      return await fetchProfile();
    } catch (profileErr) {
      if (profileErr instanceof Error && profileErr.message === 'PROFILE_NOT_FOUND') {
        const missingProfile: Profile = {
          id: data.user.id,
          user_type: 'morador',
          full_name: '',
          email,
          isProfileMissing: true,
        };
        setProfile(missingProfile);
        return missingProfile;
      }
      throw profileErr;
    }
  };

  const register = async (
    email: string,
    password: string,
    profileData: RegisterProfileData,
  ): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Erro ao criar conta no Supabase.');

    await apiService.registerProfile({
      ...profileData,
      user_type: profileData.user_type,
      full_name: profileData.full_name,
      cpf: profileData.cpf,
    });
  };

  const completeProfile = async (profileData: RegisterProfileData): Promise<Profile> => {
    if (!user) throw new Error('Nenhum usuário logado no Supabase Auth.');

    await apiService.registerProfile({
      ...profileData,
      user_type: profileData.user_type,
      full_name: profileData.full_name,
      cpf: profileData.cpf,
    });

    const newProfile: Profile = {
      id: user.id,
      user_type: profileData.user_type,
      full_name: profileData.full_name,
      email: user.email ?? '',
      phone: profileData.phone,
      provider: profileData.user_type === 'prestador' ? {
        id: user.id,
        business_name: profileData.business_name ?? '',
        category: profileData.category ?? '',
        description: profileData.description,
        center_lat: profileData.center_lat ?? 0,
        center_lng: profileData.center_lng ?? 0,
        radius_km: profileData.radius_km ?? 0,
        subscription_status: 'active',
        avg_rating: 0,
        review_count: 0,
      } : undefined,
    };

    setProfile(newProfile);
    return newProfile;
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        completeProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
