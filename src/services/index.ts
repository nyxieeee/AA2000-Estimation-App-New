// Core service that manages data access across all modes (Supabase or localStorage)
import type { SurveyType } from '../types';
import type { QueryParams, PaginatedResponse } from './api/client';
import { SupabaseService } from './supabase';
import { LocalStorageService } from './local-storage';

interface ServiceConfig {
  useSupabase: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export class DataService {
  private supabaseService?: SupabaseService;
  private localStorageService?: LocalStorageService;

  constructor(config: ServiceConfig) {
    if (config.useSupabase && config.supabaseUrl && config.supabaseKey) {
      this.supabaseService = new SupabaseService();
    }
    this.localStorageService = new LocalStorageService();
  }

  get supabase() {
    if (!this.supabaseService) {
      throw new Error('Supabase not configured');
    }
    return this.supabaseService;
  }

  get localStorage() {
    if (!this.localStorageService) {
      throw new Error('LocalStorage not available');
    }
    return this.localStorageService;
  }

  // Unified project operations
  async getProjects(params?: QueryParams) {
    const service = this.useSupabase() ? this.supabase : this.localStorage;
    return service.getProjects(params);
  }

  async getProject(id: string) {
    const service = this.useSupabase() ? this.supabase : this.localStorage;
    return service.getProject(id);
  }

  async createProject(data: any) {
    const service = this.useSupabase() ? this.supabase : this.localStorage;
    return service.createProject(data);
  }

  async updateProject(id: string, data: any) {
    const service = this.useSupabase() ? this.supabase : this.localStorage;
    return service.updateProject(id, data);
  }

  async deleteProject(id: string) {
    const service = this.useSupabase() ? this.supabase : this.localStorage;
    return service.deleteProject(id);
  }

  // Unified survey operations
  async getSurveys(projectId?: string, type?: SurveyType) {
    const svc = this.useSupabase() ? this.supabase : this.localStorage;
    return svc.getSurveys(projectId, type);
  }

  async getSurvey(id: string) {
    const svc = this.useSupabase() ? this.supabase : this.localStorage;
    return svc.getSurvey(id);
  }

  async createSurvey(data: any) {
    const svc = this.useSupabase() ? this.supabase : this.localStorage;
    return svc.createSurvey(data);
  }

  async updateSurvey(id: string, data: any) {
    const svc = this.useSupabase() ? this.supabase : this.localStorage;
    return svc.updateSurvey(id, data);
  }

  async deleteSurvey(id: string) {
    const svc = this.useSupabase() ? this.supabase : this.localStorage;
    return svc.deleteSurvey(id);
  }

  // Unified user operations
  async getUsers() {
    const svc = this.useSupabase() ? this.supabase : this.localStorage;
    return svc.getUsers();
  }

  async createUser(data: any) {
    const svc = this.useSupabase() ? this.supabase : this.localStorage;
    return svc.createUser(data);
  }

  // File operations
  async uploadFile(file: File, path: string) {
    const service = this.useSupabase() ? this.supabase : this.localStorage;
    return service.uploadFile(file, path);
  }

  // Configuration methods
  isSupabaseConfigured(): boolean {
    return !!this.supabaseService;
  }

  useSupabase(): boolean {
    return !!this.supabaseService;
  }

  // Utility methods
  clearAllData(): void {
    this.localStorage?.clearCache();
  }

  seedDevelopmentData(): void {
    this.localStorage?.seedDevelopmentData();
  }
}
