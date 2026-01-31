import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, ArrowRight, Loader2, Database, Zap, HardDrive } from 'lucide-react';
import { csvApi } from '../api';

const OPTIMIZATION_LEVELS = [
  { value: 'none', label: 'None', description: 'No optimization - original data types' },
  { value: 'standard', label: 'Standard', description: 'Basic integer/float downcasting (recommended)' },
  { value: 'aggressive', label: 'Aggressive', description: 'Aggressive type optimization + categories' },
  { value: 'maximum', label: 'Maximum', description: 'Maximum compression (may affect precision)' },
];

function CsvUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [tableName, setTableName] = useState('records');
  const [clearExisting, setClearExisting] = useState(false);
  const [optimizationLevel, setOptimizationLevel] = useState('standard');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setUploadResult(null);
    
    // Preview the file
    try {
      const previewData = await csvApi.previewCsv(selectedFile);
      setPreview(previewData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to preview file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const result = await csvApi.uploadCsv(tableName, file, clearExisting, optimizationLevel);
      setUploadResult(result);
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadComplete?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 p-2 rounded-lg">
            <Upload className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">CSV Upload</h2>
            <p className="text-sm text-gray-500">Import data from CSV files with automatic field mapping</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {uploadResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">Upload Successful!</h3>
              <p className="text-sm text-green-700 mt-1">
                Imported {uploadResult.inserted_rows} of {uploadResult.total_rows} rows into "{uploadResult.table_name}"
              </p>
              {uploadResult.columns && (
                <p className="text-sm text-green-600 mt-2">
                  Columns: {uploadResult.columns.join(', ')}
                </p>
              )}
              
              {/* Size Info */}
              {uploadResult.size_info && (
                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="h-4 w-4 text-green-700" />
                    <span className="text-sm font-medium text-green-800">Storage Impact</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                    <div>Estimated DB Size: <span className="font-medium">{uploadResult.size_info.estimated_db_size}</span></div>
                    <div>Original File: <span className="font-medium">{uploadResult.size_info.original_file_size}</span></div>
                    {uploadResult.size_info.optimization_applied && (
                      <div className="col-span-2">
                        Optimization: <span className="font-medium capitalize">{uploadResult.size_info.optimization_applied}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-yellow-700">Some rows had issues:</p>
                  <ul className="mt-1 text-sm text-yellow-600 list-disc list-inside">
                    {uploadResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={resetUpload}
                className="mt-4 text-sm font-medium text-green-700 hover:text-green-800"
              >
                Upload another file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!uploadResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Table
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                placeholder="Enter table name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                  Data Optimization
                </span>
              </label>
              <select
                value={optimizationLevel}
                onChange={(e) => setOptimizationLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                {OPTIMIZATION_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Clear existing data before import</span>
            </label>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <FileText className="h-10 w-10 text-primary-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-4 text-sm font-medium text-gray-700">
                  Drop your CSV file here or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supports any CSV structure with automatic field mapping
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !uploadResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Preview</h3>
            <p className="text-sm text-gray-500 mt-1">
              {preview.total_rows} rows • {preview.cleaned_columns.length} columns
            </p>
          </div>
          
          {/* Size Estimation */}
          {preview.estimated_db_size && (
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center space-x-2 mb-3">
                <Database className="h-5 w-5 text-purple-600" />
                <h4 className="text-sm font-medium text-purple-800">Estimated Database Impact</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">File Size</p>
                  <p className="text-lg font-bold text-gray-900">{preview.file_size || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">Est. DB Storage</p>
                  <p className="text-lg font-bold text-gray-900">{preview.estimated_db_size}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">Rows × Columns</p>
                  <p className="text-lg font-bold text-gray-900">{preview.total_rows} × {preview.cleaned_columns.length}</p>
                </div>
              </div>
              
              {/* Optimization Preview */}
              {preview.optimization_preview && (
                <div className="mt-4">
                  <h5 className="text-xs font-medium text-purple-700 mb-2">Size with optimization:</h5>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(preview.optimization_preview).map(([level, size]) => (
                      <div 
                        key={level}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          level === optimizationLevel 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white border border-purple-200 text-purple-700'
                        }`}
                      >
                        {level}: {size}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Column Mapping */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Column Mapping</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preview.column_mapping).map(([original, cleaned]) => (
                <div 
                  key={original}
                  className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                >
                  <span className="text-gray-500">{original}</span>
                  <ArrowRight className="h-3 w-3 mx-2 text-gray-400" />
                  <span className="font-medium text-gray-900">{cleaned}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Preview Data */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {preview.cleaned_columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.preview_data.map((row, idx) => (
                  <tr key={idx}>
                    {preview.cleaned_columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {row[col] ?? <span className="text-gray-400 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {preview.total_rows > 5 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Showing 5 of {preview.total_rows} rows
              </p>
            </div>
          )}
          
          {/* Upload Button */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={resetUpload}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload to "{tableName}"
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">CSV Upload Tips</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• CSV files can have any column structure</li>
              <li>• Column names will be cleaned (lowercase, spaces to underscores)</li>
              <li>• An ID and timestamp will be added automatically if not present</li>
              <li>• Use "Clear existing data" to replace all records</li>
              <li>• Large files are uploaded in batches for reliability</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Optimization Guide */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Zap className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Data Optimization Guide</h3>
            <div className="mt-2 text-sm text-yellow-700 space-y-2">
              <div>
                <span className="font-medium">None:</span> Keeps original data types. Use when precision is critical.
              </div>
              <div>
                <span className="font-medium">Standard:</span> Downcasts integers and floats to smaller types. Recommended for most use cases.
              </div>
              <div>
                <span className="font-medium">Aggressive:</span> Converts low-cardinality strings to categories, more aggressive number compression.
              </div>
              <div>
                <span className="font-medium">Maximum:</span> Maximum compression including float32. May slightly reduce decimal precision.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CsvUpload;
