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

  // Create record
  createRecord: async (tableName, data) => {
    const response = await api.post(`/api/data/${tableName}`, { data });
    return response.data;
  },

  // Update record
  updateRecord: async (tableName, id, data) => {
    const response = await api.put(`/api/data/${tableName}/${id}`, { data });
    return response.data;
  },

  // Delete record
  deleteRecord: async (tableName, id) => {
    const response = await api.delete(`/api/data/${tableName}/${id}`);
    return response.data;
  },

  // Delete all records
  deleteAllRecords: async (tableName) => {
    const response = await api.delete(`/api/data/${tableName}`);
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

// CSV API
export const csvApi = {
  // Upload CSV
  uploadCsv: async (tableName, file, clearExisting = false, optimize = 'standard') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clear_existing', clearExisting);
    formData.append('optimize', optimize);
    
    const response = await api.post(`/api/csv/upload/${tableName}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Preview CSV
  previewCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/csv/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Export CSV (returns blob URL)
  exportCsv: async (tableName) => {
    const response = await api.get(`/api/csv/export/${tableName}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Validate CSV
  validateCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/csv/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Storage API
export const storageApi = {
  // Get storage info
  getStorageInfo: async () => {
    const response = await api.get('/api/storage/info');
    return response.data;
  },

  // List buckets
  listBuckets: async () => {
    const response = await api.get('/api/storage/buckets');
    return response.data;
  },

  // List bucket files
  listBucketFiles: async (bucketName, path = '') => {
    const response = await api.get(`/api/storage/buckets/${bucketName}/files`, {
      params: { path },
    });
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;
