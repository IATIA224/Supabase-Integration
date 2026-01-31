import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

function RecordModal({ record, columns, onSave, onClose }) {
  const [formData, setFormData] = useState(() => {
    if (record) {
      return columns.reduce((acc, col) => {
        acc[col] = record[col] ?? '';
        return acc;
      }, {});
    }
    return columns.reduce((acc, col) => {
      acc[col] = '';
      return acc;
    }, {});
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (column, value) => {
    setFormData(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Clean up empty strings
      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      await onSave(cleanedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {record ? 'Edit Record' : 'Add New Record'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <div className="space-y-4">
                {columns.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No editable columns available.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add some data via CSV upload first.
                    </p>
                  </div>
                ) : (
                  columns.map((column) => (
                    <div key={column}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {column.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={formData[column] ?? ''}
                        onChange={(e) => handleChange(column, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        placeholder={`Enter ${column.replace(/_/g, ' ')}`}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || columns.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RecordModal;
