'use client';

import { useState } from 'react';
import { Upload, Download, FileText, Settings, CheckCircle, AlertCircle } from 'lucide-react';

interface ProcessingConfig {
  excluded_columns: string[];
  column_widths: {
    A: string;
    B: string;
    C: string;
  };
}

interface ApiResponse {
  files: Record<string, string>;
  count: number;
  sheet_names: string[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [config, setConfig] = useState<ProcessingConfig>({
    excluded_columns: ['B', 'C', 'D', 'E'],
    column_widths: {
      A: '4.0',
      B: '4.0',
      C: '2.0'
    }
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('excluded_columns', JSON.stringify(config.excluded_columns));
    formData.append('column_widths', JSON.stringify(config.column_widths));

    try {
      const response = await fetch('http://localhost:8000/api/generate-latex', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.detail || errorText || 'Failed to process file');
        } catch {
          throw new Error(errorText || 'Failed to process file');
        }
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    if (!result) return;

    try {
      const response = await fetch('http://localhost:8000/api/download-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result.files),
      });

      if (!response.ok) {
        throw new Error('Failed to download zip');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'latex_tables.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download zip');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      <div className="relative container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              LOD Matrix Excel2TeX
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Configuration Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
                    <Settings className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Configuration</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-3">
                      Excluded Columns
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((col) => (
                        <label key={col} className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            className="rounded border-purple-600 text-purple-600 focus:ring-purple-500 bg-slate-700/50 group-hover:bg-slate-600/50 transition-colors"
                            checked={config.excluded_columns.includes(col)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfig(prev => ({
                                  ...prev,
                                  excluded_columns: [...prev.excluded_columns, col]
                                }));
                              } else {
                                setConfig(prev => ({
                                  ...prev,
                                  excluded_columns: prev.excluded_columns.filter(c => c !== col)
                                }));
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-300 group-hover:text-white transition-colors">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-3">
                      Column Widths
                    </label>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-300 mb-2">Column A width</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          value={config.column_widths.A}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            column_widths: { ...prev.column_widths, A: e.target.value }
                          }))}
                          className="w-full rounded-lg border-slate-600/50 bg-slate-800/50 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-slate-700/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-2">Column B width</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          value={config.column_widths.B}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            column_widths: { ...prev.column_widths, B: e.target.value }
                          }))}
                          className="w-full rounded-lg border-slate-600/50 bg-slate-800/50 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-slate-700/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-2">Columns C-I width</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          value={config.column_widths.C}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            column_widths: { ...prev.column_widths, C: e.target.value }
                          }))}
                          className="w-full rounded-lg border-slate-600/50 bg-slate-800/50 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-slate-700/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Upload Excel File
                  </label>
                  <div className="border-2 border-dashed border-slate-600/50 rounded-xl p-8 text-center hover:border-purple-400/50 transition-all duration-300 bg-slate-800/30 hover:bg-slate-800/50 backdrop-blur-sm group">
                    <div className="flex flex-col items-center">
                      <div className="p-4 bg-purple-500/10 rounded-full mb-4 group-hover:bg-purple-500/20 transition-colors">
                        <Upload className="w-12 h-12 text-purple-400" />
                      </div>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                          Choose a file
                        </span>
                        <span className="text-gray-400"> or drag and drop</span>
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        {file ? (
                          <span className="text-green-400 font-medium">{file.name}</span>
                        ) : 'Excel files (.xlsx, .xls)'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!file || loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center font-medium shadow-lg hover:shadow-purple-500/25 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      Generate LaTeX Tables
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-500/20 rounded-lg mr-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <p className="text-red-300 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="mt-6">
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-green-500/20 rounded-lg mr-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      </div>
                      <p className="text-green-300 font-medium text-lg">
                        Generated {result.count} LaTeX files successfully!
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-white mb-4 text-lg">Generated Files:</h3>
                        <div className="space-y-3">
                          {Object.entries(result.files).map(([filename, content]) => (
                            <div key={filename} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                              <div className="flex items-center">
                                <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
                                  <FileText className="w-4 h-4 text-purple-400" />
                                </div>
                                <span className="text-sm font-medium text-white">{filename}</span>
                              </div>
                              <button
                                onClick={() => handleDownload(filename, content)}
                                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleDownloadAll}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center font-medium shadow-lg hover:shadow-green-500/25"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download All as ZIP
                      </button>

                      <div className="mt-6 p-6 bg-purple-500/10 border border-purple-500/20 rounded-xl backdrop-blur-sm">
                        <h4 className="font-medium text-purple-300 mb-4 text-lg flex items-center">
                          <span className="mr-2">📖</span>
                          LaTeX Usage Instructions
                        </h4>
                        <div className="text-sm text-purple-200 space-y-3"
                          dangerouslySetInnerHTML={{
                            __html: `
                          <p class="font-medium text-white"><strong>1. Add required packages</strong> to your LaTeX document preamble:</p>
                          <pre class="bg-purple-900/50 p-3 rounded-lg text-purple-300 text-xs overflow-x-auto border border-purple-500/20">\\usepackage{array}
\\usepackage{xcolor}
\\usepackage{colortbl}
\\usepackage{longtable}</pre>
                          <p class="font-medium text-white"><strong>2. Include the .tex file</strong> in your document:</p>
                          <pre class="bg-purple-900/50 p-3 rounded-lg text-purple-300 text-xs overflow-x-auto border border-purple-500/20">\\input{filename.tex}</pre>
                          <p class="font-medium text-white"><strong>3. Compile</strong> with pdflatex or xelatex</p>
                            `
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
