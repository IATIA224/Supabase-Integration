import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Data API
export const dataApi = {
  // Get paginated records
  getRecords: async (tableName, params = {}) => {
    const { page = 1, pageSize = 10, search = '', sortBy = '', sortOrder = 'asc' } = params;
    const response = await api.get(`/api/data/${tableName}`, {
      params: {
        page,
        page_size: pageSize,
        search: search || undefined,
        sort_by: sortBy || undefined,
        sort_order: sortOrder,
      },
    });
    return response.data;
  },

  // Get all records
  getAllRecords: async (tableName) => {
    const response = await api.get(`/api/data/${tableName}/all`);
    return response.data;
  },

  // Get single record
  getRecord: async (tableName, id) => {
    const response = await api.get(`/api/data/${tableName}/${id}`);
    return response.data;
  },

  // Get table columns
  getColumns: async (tableName) => {
    const response = await api.get(`/api/data/${tableName}/schema/columns`);
    return response.data;
  },

  // Get available tables
  getTables: async () => {
    const response = await api.get('/api/data/tables');
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;
