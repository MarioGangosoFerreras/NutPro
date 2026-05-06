import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Preferences } from '@capacitor/preferences';

// 1. Creamos un adaptador de almacenamiento para Capacitor
const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    await Preferences.remove({ key });
  },
};

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // 2. Le indicamos a Supabase que use nuestro adaptador nativo
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        storage: capacitorStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      }
    });
  }

  get client() {
    return this.supabase;
  }
}