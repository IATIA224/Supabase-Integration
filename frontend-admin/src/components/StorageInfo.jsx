import { useState, useEffect } from 'react';
import { HardDrive, Database, RefreshCw, Server, Folder, PieChart, BarChart3 } from 'lucide-react';
import { storageApi } from '../api';

function StorageInfo() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStorageInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await storageApi.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch storage info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getUsageTextColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading storage information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={fetchStorageInfo}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const fileStorage = storageInfo?.file_storage || {};
  const database = storageInfo?.database || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-100 p-2 rounded-lg">
              <PieChart className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Storage & Database Usage</h2>
              <p className="text-sm text-gray-500">Supabase {storageInfo?.tier || 'free'} tier usage</p>
            </div>
          </div>
          <button
            onClick={fetchStorageInfo}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Database Usage Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Database className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Database Storage</h3>
            <p className="text-xs text-gray-500">PostgreSQL database usage (where your CSV data is stored)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Total Capacity</p>
            <p className="text-2xl font-bold text-gray-900">{database.total_formatted || '500 MB'}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Used</p>
            <p className="text-2xl font-bold text-gray-900">{database.used_formatted || '0 B'}</p>
            <p className={`text-sm ${getUsageTextColor(database.usage_percentage || 0)}`}>
              {database.usage_percentage || 0}% of total
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Available</p>
            <p className="text-2xl font-bold text-gray-900">{database.remaining_formatted || '500 MB'}</p>
          </div>
        </div>

        {/* Database Usage Bar */}
        <div className="relative">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Database Usage</span>
            <span>{database.usage_percentage || 0}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageColor(database.usage_percentage || 0)} transition-all duration-500`}
              style={{ width: `${Math.min(database.usage_percentage || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Table Sizes */}
        {database.table_sizes && database.table_sizes.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Table Sizes</h4>
            <div className="space-y-2">
              {database.table_sizes.map((table, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{table.table_name}</span>
                  <span className="font-medium text-gray-900">{table.size_formatted}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File Storage Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <HardDrive className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">File Storage</h3>
            <p className="text-xs text-gray-500">Supabase storage buckets for files and media</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total Capacity</p>
            <p className="text-2xl font-bold text-gray-900">{fileStorage.total_formatted || '1 GB'}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Used</p>
            <p className="text-2xl font-bold text-gray-900">{fileStorage.used_formatted || '0 B'}</p>
            <p className={`text-sm ${getUsageTextColor(fileStorage.usage_percentage || 0)}`}>
              {fileStorage.usage_percentage || 0}% of total
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Available</p>
            <p className="text-2xl font-bold text-gray-900">{fileStorage.remaining_formatted || '1 GB'}</p>
          </div>
        </div>

        {/* File Storage Usage Bar */}
        <div className="relative">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>File Storage Usage</span>
            <span>{fileStorage.usage_percentage || 0}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageColor(fileStorage.usage_percentage || 0)} transition-all duration-500`}
              style={{ width: `${Math.min(fileStorage.usage_percentage || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Buckets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Folder className="h-5 w-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Storage Buckets</h3>
            <span className="text-sm text-gray-500">
              ({storageInfo?.bucket_count || 0} buckets)
            </span>
          </div>
        </div>
        
        {storageInfo?.buckets && storageInfo.buckets.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {storageInfo.buckets.map((bucket, idx) => (
              <div key={bucket.name || idx} className="px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Folder className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{bucket.name}</p>
                    {bucket.file_count !== undefined && (
                      <p className="text-sm text-gray-500">{bucket.file_count} files</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {bucket.error ? (
                    <span className="text-sm text-red-500">{bucket.error}</span>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {bucket.size_formatted || '0 B'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <Folder className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-2 text-gray-500">No storage buckets found</p>
            <p className="text-sm text-gray-400 mt-1">
              Create a bucket in your Supabase dashboard to get started
            </p>
          </div>
        )}
      </div>

      {/* Tips for saving space */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-800 mb-2">💡 Tips to Optimize Storage</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use "Aggressive" or "Maximum" optimization when uploading CSV files</li>
          <li>• Trim whitespace from text fields before uploading</li>
          <li>• Use shorter column names (they're stored with every row)</li>
          <li>• Remove unnecessary columns before import</li>
          <li>• Consider deleting old records you no longer need</li>
        </ul>
      </div>

      {/* Error Note */}
      {storageInfo?.error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-700">
            Note: Some storage metrics may be estimated. For accurate database size, 
            create a PostgreSQL function in your Supabase dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

export default StorageInfo;
