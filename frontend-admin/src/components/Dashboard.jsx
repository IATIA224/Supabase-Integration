import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Search, ChevronLeft, ChevronRight, Plus, 
  Download, Trash2, Table, Edit2, Zap 
} from 'lucide-react';
import { dataApi, csvApi } from '../api';
import DataTable from './DataTable';
import RecordModal from './RecordModal';
import ConfirmDialog from './ConfirmDialog';
import { useWebSocket } from '../hooks/useWebSocket';

function Dashboard({ refreshTrigger }) {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableName, setTableName] = useState('records');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Sort state
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dataApi.getRecords(tableName, {
        page: currentPage,
        pageSize,
        search: debouncedSearch,
        sortBy,
        sortOrder,
      });
      
      setData(response.data || []);
      setTotalItems(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      if (response.data && response.data.length > 0) {
        setColumns(Object.keys(response.data[0]));
      } else {
        try {
          const columnsResponse = await dataApi.getColumns(tableName);
          setColumns(columnsResponse.columns || []);
        } catch {
          setColumns(['id', 'created_at']);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tableName, currentPage, pageSize, debouncedSearch, sortBy, sortOrder]);

  // WebSocket handler for real-time updates
  const handleWebSocketMessage = useCallback((message) => {
    if (message.table === tableName || !message.table) {
      const updateTypes = ['record_created', 'record_updated', 'record_deleted', 'all_records_deleted', 'csv_uploaded'];
      if (updateTypes.includes(message.type)) {
        setLastUpdate(new Date().toLocaleTimeString());
        fetchData();
      }
    }
  }, [tableName, fetchData]);

  const { isConnected: wsConnected } = useWebSocket(handleWebSocketMessage);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleCreate = () => {
    setEditingRecord(null);
    setShowModal(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowModal(true);
  };

  const handleDeleteClick = (recordId) => {
    setDeletingRecordId(recordId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    try {
      await dataApi.deleteRecord(tableName, deletingRecordId);
      setShowDeleteConfirm(false);
      setDeletingRecordId(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete record');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await dataApi.deleteAllRecords(tableName);
      setShowDeleteAllConfirm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete all records');
    }
  };

  const handleSave = async (recordData) => {
    try {
      if (editingRecord) {
        await dataApi.updateRecord(tableName, editingRecord.id, recordData);
      } else {
        await dataApi.createRecord(tableName, recordData);
      }
      setShowModal(false);
      setEditingRecord(null);
      fetchData();
    } catch (err) {
      throw new Error(err.response?.data?.detail || 'Failed to save record');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await csvApi.exportCsv(tableName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="bg-primary-100 p-2 rounded-lg shrink-0">
                <Table className="h-5 w-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Data Management</h2>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <Zap className="h-3 w-3" />
                    <span className="hidden sm:inline">{wsConnected ? 'Live' : 'Offline'}</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {totalItems} records • Page {currentPage}/{totalPages}
                  {lastUpdate && <span className="text-primary-600 hidden sm:inline"> • Updated {lastUpdate}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Search Row */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full text-sm"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <button
              onClick={handleCreate}
              className="inline-flex items-center justify-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Record</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={data.length === 0}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </button>
            
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={data.length === 0}
              className="inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
        
        {/* Pagination */}
        <div className="border-t border-gray-200 px-3 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm text-gray-700">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <span className="text-xs sm:text-sm text-gray-700">
                {data.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Prev</span>
              </button>
              <span className="text-sm text-gray-700 px-2">{currentPage}/{totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Modal */}
      {showModal && (
        <RecordModal
          record={editingRecord}
          columns={columns.filter(c => c !== 'id' && c !== 'created_at' && c !== 'updated_at')}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingRecord(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Record"
          message="Are you sure you want to delete this record? This action cannot be undone."
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeletingRecordId(null);
          }}
        />
      )}

      {/* Delete All Confirmation */}
      {showDeleteAllConfirm && (
        <ConfirmDialog
          title="Delete All Records"
          message={`Are you sure you want to delete all ${totalItems} records? This action cannot be undone.`}
          confirmLabel="Delete All"
          confirmVariant="danger"
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteAllConfirm(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
