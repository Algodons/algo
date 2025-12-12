import React, { useState, useEffect } from 'react';
import './DataBrowser.css';

interface DataBrowserProps {
  connectionId: string;
}

interface TableData {
  rows: any[];
  columns: string[];
  totalRows: number;
}

const DataBrowser: React.FC<DataBrowserProps> = ({ connectionId }) => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

  useEffect(() => {
    if (connectionId) {
      fetchTables();
    }
  }, [connectionId]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, page, sortColumn, sortDirection]);

  const fetchTables = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/databases/connections/${connectionId}/tables`);
      const data = await response.json();
      if (data.tables) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
      setError('Failed to load tables');
    }
  };

  const fetchTableData = async () => {
    setLoading(true);
    setError('');
    try {
      const offset = (page - 1) * pageSize;
      let query = `SELECT * FROM ${selectedTable}`;
      
      if (sortColumn) {
        query += ` ORDER BY ${sortColumn} ${sortDirection}`;
      }
      
      query += ` LIMIT ${pageSize} OFFSET ${offset}`;

      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setTableData(null);
      } else {
        const columns = data.fields ? data.fields.map((f: any) => f.name) : Object.keys(data.rows[0] || {});
        setTableData({
          rows: data.rows || [],
          columns: columns,
          totalRows: data.rowCount || data.rows?.length || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch table data:', error);
      setError('Failed to load table data');
      setTableData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortColumn(column);
      setSortDirection('ASC');
    }
  };

  const exportToCSV = () => {
    if (!tableData) return;

    const headers = tableData.columns.join(',');
    const rows = tableData.rows.map((row) =>
      tableData.columns.map((col) => {
        const value = row[col];
        // Escape values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalPages = tableData ? Math.ceil(tableData.totalRows / pageSize) : 0;

  return (
    <div className="data-browser">
      <div className="db-toolbar">
        <div className="db-toolbar-left">
          <select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Select a table...</option>
            {tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
          {selectedTable && (
            <button className="btn-small" onClick={fetchTableData}>
              Refresh
            </button>
          )}
        </div>
        <div className="db-toolbar-right">
          {selectedTable && tableData && (
            <>
              <span className="row-count">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, tableData.totalRows)} of{' '}
                {tableData.totalRows} rows
              </span>
              <button className="btn-small" onClick={exportToCSV}>
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="db-error">{error}</div>}

      {loading && <div className="db-loading">Loading data...</div>}

      {tableData && !loading && (
        <>
          <div className="db-table-wrapper">
            <table className="db-table">
              <thead>
                <tr>
                  {tableData.columns.map((column) => (
                    <th key={column} onClick={() => handleSort(column)}>
                      <div className="th-content">
                        {column}
                        {sortColumn === column && (
                          <span className="sort-indicator">
                            {sortDirection === 'ASC' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {tableData.columns.map((column) => (
                      <td key={column}>
                        <div className="td-content">
                          {row[column] !== null && row[column] !== undefined
                            ? String(row[column])
                            : <span className="null-value">NULL</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="db-pagination">
            <button
              className="btn-small"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-small"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DataBrowser;
