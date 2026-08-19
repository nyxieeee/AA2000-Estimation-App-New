// Local storage service as fallback when Supabase is not available
import type { Project, User, SurveyType } from '../../types';
import { ApiClient } from '../api/client';
import type { ApiResponse, QueryParams } from '../api/client';

export class LocalStorageService extends ApiClient {
  constructor() {
    super('');
  }

  private readonly prefix = 'aa2000_cache_';

  // Cache TTL in milliseconds
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Check if URL indicates Supabase endpoint
    if (url.includes('/functions/v1/') || url.includes('/api/')) {
      throw new Error('LocalStorageService cannot make external requests');
    }

    const cacheKey = `${this.prefix}${url}`;
    const cached = localStorage.getItem(cacheKey);

    // Return cached data if available and not expired
    if (cached) {
      try {
        const { data, timestamp, ttl } = JSON.parse(cached) as {
          data: T;
          timestamp: number;
          ttl: number;
        };

        if (Date.now() < timestamp + (ttl || this.DEFAULT_CACHE_TTL)) {
          return {
            success: true,
            data,
          };
        }
      } catch (e) {
        console.warn('Invalid cache entry for key:', cacheKey, e);
        localStorage.removeItem(cacheKey);
      }
    }

    // For local-only operations, handle them directly
    if (options.method === 'GET' && !url.includes('/')) {
      const mockData = this.generateMockData(url);
      // Cache the successful response
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: mockData,
          timestamp: Date.now(),
          ttl: this.DEFAULT_CACHE_TTL,
        })
      );
      return {
        success: true,
        data: mockData as T,
      };
    }

    return {
      success: false,
      error: {
        message: 'Local operation not supported',
        code: 'LOCAL_ERROR',
      },
    };
  }

  // Generate mock data for development
  private generateMockData(url: string): unknown {
    switch (url) {
      case '/projects':
        return [
          {
            id: 'proj-1',
            name: 'Office Site Survey - Phase 1',
            clientName: 'TechCorp',
            location: 'New York, NY',
            status: 'In Progress',
            assignedTo: ['user-1'],
            createdAt: new Date('2024-01-15').toISOString(),
          },
          {
            id: 'proj-2',
            name: 'Retail Store CCTV Upgrade',
            clientName: 'Retail Inc',
            location: 'Los Angeles, CA',
            status: 'Pending',
            assignedTo: ['user-2'],
            createdAt: new Date('2024-01-20').toISOString(),
          },
        ];
      case '/surveys':
        return [
          {
            id: 'survey-1',
            type: 'CCTV',
            projectId: 'proj-1',
            status: 'Draft',
            lastUpdated: new Date().toISOString(),
          },
        ];
      default:
        return null;
    }
  }

  // Project operations
  async getProjects(params?: QueryParams) {
    const projects = JSON.parse(localStorage.getItem('aa2000_projects') || '[]');
    return {
      success: true,
      data: projects,
    };
  }

  async getProject(id: string) {
    const projects = JSON.parse(localStorage.getItem('aa2000_projects') || '[]');
    const project = projects.find((p: any) => p.id === id);
    if (project) {
      return {
        success: true,
        data: project,
      };
    }
    return {
      success: false,
      error: { message: 'Project not found', code: 'NOT_FOUND' },
    };
  }

  async createProject(data: any) {
    localStorage.setItem(
      'aa2000_projects',
      JSON.stringify([...(JSON.parse(localStorage.getItem('aa2000_projects') || '[]') || []), data])
    );
    return {
      success: true,
      data: { id: `proj-${Date.now()}`, ...data, createdAt: new Date().toISOString() },
    };
  }

  async updateProject(id: string, data: any) {
    const projects = JSON.parse(localStorage.getItem('aa2000_projects') || '[]');
    const index = projects.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem('aa2000_projects', JSON.stringify(projects));
      return {
        success: true,
        data: projects[index],
      };
    }
    return {
      success: false,
      error: { message: 'Project not found', code: 'NOT_FOUND' },
    };
  }

  async deleteProject(id: string) {
    const projects = JSON.parse(localStorage.getItem('aa2000_projects') || '[]');
    const filtered = projects.filter((p: any) => p.id !== id);
    localStorage.setItem('aa2000_projects', JSON.stringify(filtered));
    return {
      success: true,
      data: { id, deleted: true },
    };
  }

  // Survey operations
  async getSurveys(projectId?: string, type?: SurveyType) {
    const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
    let filtered = surveys;
    if (projectId) filtered = filtered.filter((s: any) => s.projectId === projectId);
    if (type) filtered = filtered.filter((s: any) => s.type === type);
    return {
      success: true,
      data: filtered,
    };
  }

  async getSurvey(id: string) {
    const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
    const survey = surveys.find((s: any) => s.id === id);
    if (!survey) {
      return {
        success: false,
        error: { message: 'Survey not found', code: 'NOT_FOUND' },
      };
    }
    return {
      success: true,
      data: survey,
    };
  }

  async createSurvey(data: any) {
    const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
    const newSurvey = {
      id: `survey-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    surveys.push(newSurvey);
    localStorage.setItem('aa2000_surveys', JSON.stringify(surveys));
    return {
      success: true,
      data: newSurvey,
    };
  }

  async updateSurvey(id: string, data: any) {
    const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
    const index = surveys.findIndex((s: any) => s.id === id);
    if (index === -1) {
      return {
        success: false,
        error: { message: 'Survey not found', code: 'NOT_FOUND' },
      };
    }
    surveys[index] = { ...surveys[index], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem('aa2000_surveys', JSON.stringify(surveys));
    return {
      success: true,
      data: surveys[index],
    };
  }

  async deleteSurvey(id: string) {
    const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
    const filtered = surveys.filter((s: any) => s.id !== id);
    localStorage.setItem('aa2000_surveys', JSON.stringify(filtered));
    return {
      success: true,
      data: { id, deleted: true },
    };
  }

  // Authentication operations
  async getUsers() {
    const users = JSON.parse(localStorage.getItem('aa2000_users') || '[]');
    return {
      success: true,
      data: users,
    };
  }

  async createUser(data: any) {
    const users = JSON.parse(localStorage.getItem('aa2000_users') || '[]');
    const newUser = {
      id: `user-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem('aa2000_users', JSON.stringify(users));
    return {
      success: true,
      data: newUser,
    };
  }

  // File operations
  async uploadFile(file: File, path: string) {
    return {
      success: true,
      data: {
        path,
        url: `${this.prefix}${path}`,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    };
  }

  // Utility methods
  clearCache(url?: string) {
    if (url) {
      localStorage.removeItem(`${this.prefix}${url}`);
    } else {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key));
    }
  }

  // Development helper: seed initial data
  seedDevelopmentData() {
    if (localStorage.getItem('aa2000_projects')) return;

    const initialData = {
      projects: [
        {
          id: 'proj-dev-1',
          name: 'Development Site - Downtown Office',
          clientName: 'TechCorp Solutions',
          clientContact: 'john@techcorp.com',
          location: '123 Main St, New York, NY 10001',
          status: 'In Progress',
          startDate: '2024-01-15',
          assignedTechnicians: [
            { id: 'tech-1', fullName: 'Mike Wilson', email: 'mike@aa2000.com', role: 'TECHNICIAN' },
            { id: 'tech-2', fullName: 'Sarah Johnson', email: 'sarah@aa2000.com', role: 'TECHNICIAN' },
          ],
          createdAt: '2024-01-15T09:00:00Z',
          updatedAt: '2024-01-15T09:00:00Z',
        },
        {
          id: 'proj-dev-2',
          name: 'Retail Store Security Upgrade',
          clientName: 'Retail Inc',
          clientContact: 'sarah@retail.com',
          location: '456 Oak Ave, Los Angeles, CA 90001',
          status: 'Pending',
          startDate: '2024-01-20',
          assignedTechnicians: [
            { id: 'tech-3', fullName: 'David Chen', email: 'david@aa2000.com', role: 'TECHNICIAN' },
          ],
          createdAt: '2024-01-18T14:30:00Z',
          updatedAt: '2024-01-18T14:30:00Z',
        },
      ],
      users: [
        {
          id: 'tech-1',
          fullName: 'Mike Wilson',
          email: 'mike@aa2000.com',
          role: 'TECHNICIAN',
          password: 'password',
        },
        {
          id: 'tech-2',
          fullName: 'Sarah Johnson',
          email: 'sarah@aa2000.com',
          role: 'TECHNICIAN',
          password: 'password',
        },
        {
          id: 'tech-3',
          fullName: 'David Chen',
          email: 'david@aa2000.com',
          role: 'TECHNICIAN',
          password: 'password',
        },
        {
          id: 'sales-1',
          fullName: 'Sales User',
          email: 'sales@aa2000.com',
          role: 'SALES',
          password: 'sales123',
        },
        {
          id: 'admin-1',
          fullName: 'Admin User',
          email: 'admin@aa2000.com',
          role: 'ADMIN',
          password: 'admin123',
        },
      ],
      surveys: [
        {
          id: 'survey-dev-1',
          type: 'CCTV',
          projectId: 'proj-dev-1',
          data: {
            cameras: [],
            infrastructure: { cablePath: '', wallType: '' },
            controlRoom: { nvrLocation: '', upsRequired: undefined },
          },
          createdAt: '2024-01-15T10:00:00Z',
          status: 'Draft',
        },
      ],
    };

    Object.entries(initialData).forEach(([key, value]) => {
      localStorage.setItem(`aa2000_${key}`, JSON.stringify(value));
    });
    console.log('Development data seeded');
  }
}
