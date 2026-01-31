import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

function DataTable({ data, columns, loading, sortBy, sortOrder, onSort }) {
  // Filter out columns that shouldn't be displayed prominently
  const displayColumns = columns.filter(col => !['id', 'created_at', 'updated_at'].includes(col));
  const metaColumns = columns.filter(col => ['id', 'created_at', 'updated_at'].includes(col));
  const allColumns = [...displayColumns, ...metaColumns];

  const formatValue = (value, column) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    
    if (column === 'created_at' || column === 'updated_at') {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return value;
      }
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Truncate long strings
    const strValue = String(value);
    if (strValue.length > 100) {
      return strValue.substring(0, 100) + '...';
    }
    
    return strValue;
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary-600" />
      : <ArrowDown className="h-4 w-4 text-primary-600" />;
  };

  if (loading && data.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
        <p className="mt-1 text-sm text-gray-500">No data available in this table.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {allColumns.map((column) => (
              <th
                key={column}
                onClick={() => onSort(column)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-1">
                  <span>{column.replace(/_/g, ' ')}</span>
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr 
              key={row.id || rowIndex} 
              className="hover:bg-gray-50 transition-colors"
            >
              {allColumns.map((column) => (
                <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatValue(row[column], column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
