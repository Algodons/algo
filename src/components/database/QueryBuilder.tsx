import React, { useState, useEffect } from 'react';
import './QueryBuilder.css';

interface Table {
  name: string;
  columns: Column[];
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface QueryBuilderProps {
  connectionId: string;
  onExecute: (query: string) => void;
}

interface SelectColumn {
  table: string;
  column: string;
  alias?: string;
  aggregate?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | '';
}

interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
}

interface WhereCondition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: string;
  conjunction: 'AND' | 'OR';
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({ connectionId, onExecute }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectColumns, setSelectColumns] = useState<SelectColumn[]>([]);
  const [joins, setJoins] = useState<JoinClause[]>([]);
  const [whereConditions, setWhereConditions] = useState<WhereCondition[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState<{ column: string; direction: 'ASC' | 'DESC' }[]>([]);
  const [limit, setLimit] = useState<number>(100);
  const [generatedSQL, setGeneratedSQL] = useState<string>('');

  useEffect(() => {
    if (connectionId) {
      fetchTables();
    }
  }, [connectionId]);

  useEffect(() => {
    generateSQL();
  }, [selectedTable, selectColumns, joins, whereConditions, groupBy, orderBy, limit]);

  const fetchTables = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/databases/connections/${connectionId}/tables`);
      const data = await response.json();
      
      if (data.tables) {
        const tablesWithColumns = await Promise.all(
          data.tables.map(async (tableName: string) => {
            const schemaResponse = await fetch(
              `http://localhost:4000/api/databases/connections/${connectionId}/tables/${tableName}/schema`
            );
            const schemaData = await schemaResponse.json();
            return {
              name: tableName,
              columns: schemaData.columns || [],
            };
          })
        );
        setTables(tablesWithColumns);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const generateSQL = () => {
    if (!selectedTable) {
      setGeneratedSQL('');
      return;
    }

    let sql = 'SELECT ';

    // SELECT clause
    if (selectColumns.length === 0) {
      sql += '*';
    } else {
      sql += selectColumns
        .map((col) => {
          let colStr = `${col.table}.${col.column}`;
          if (col.aggregate) {
            colStr = `${col.aggregate}(${colStr})`;
          }
          if (col.alias) {
            colStr += ` AS ${col.alias}`;
          }
          return colStr;
        })
        .join(', ');
    }

    // FROM clause
    sql += `\nFROM ${selectedTable}`;

    // JOIN clauses
    joins.forEach((join) => {
      sql += `\n${join.type} JOIN ${join.table} ON ${join.on}`;
    });

    // WHERE clause
    if (whereConditions.length > 0) {
      sql += '\nWHERE ';
      sql += whereConditions
        .map((cond, idx) => {
          let condStr = `${cond.column} ${cond.operator} '${cond.value}'`;
          if (idx > 0) {
            condStr = `${cond.conjunction} ${condStr}`;
          }
          return condStr;
        })
        .join(' ');
    }

    // GROUP BY clause
    if (groupBy.length > 0) {
      sql += `\nGROUP BY ${groupBy.join(', ')}`;
    }

    // ORDER BY clause
    if (orderBy.length > 0) {
      sql += '\nORDER BY ' + orderBy.map((o) => `${o.column} ${o.direction}`).join(', ');
    }

    // LIMIT clause
    if (limit > 0) {
      sql += `\nLIMIT ${limit}`;
    }

    sql += ';';
    setGeneratedSQL(sql);
  };

  const addSelectColumn = () => {
    setSelectColumns([...selectColumns, { table: selectedTable, column: '', alias: '', aggregate: '' }]);
  };

  const updateSelectColumn = (index: number, field: keyof SelectColumn, value: string) => {
    const updated = [...selectColumns];
    updated[index] = { ...updated[index], [field]: value };
    setSelectColumns(updated);
  };

  const removeSelectColumn = (index: number) => {
    setSelectColumns(selectColumns.filter((_, i) => i !== index));
  };

  const addJoin = () => {
    setJoins([...joins, { type: 'INNER', table: '', on: '' }]);
  };

  const updateJoin = (index: number, field: keyof JoinClause, value: string) => {
    const updated = [...joins];
    updated[index] = { ...updated[index], [field]: value };
    setJoins(updated);
  };

  const removeJoin = (index: number) => {
    setJoins(joins.filter((_, i) => i !== index));
  };

  const addWhereCondition = () => {
    setWhereConditions([
      ...whereConditions,
      { column: '', operator: '=', value: '', conjunction: 'AND' },
    ]);
  };

  const updateWhereCondition = (index: number, field: keyof WhereCondition, value: string) => {
    const updated = [...whereConditions];
    updated[index] = { ...updated[index], [field]: value };
    setWhereConditions(updated);
  };

  const removeWhereCondition = (index: number) => {
    setWhereConditions(whereConditions.filter((_, i) => i !== index));
  };

  const getTableColumns = (tableName: string) => {
    const table = tables.find((t) => t.name === tableName);
    return table ? table.columns : [];
  };

  return (
    <div className="query-builder">
      <div className="qb-section">
        <h3>Visual Query Builder</h3>
        
        {/* Table Selection */}
        <div className="qb-field">
          <label>Base Table:</label>
          <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
            <option value="">Select a table...</option>
            {tables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </div>

        {selectedTable && (
          <>
            {/* SELECT Columns */}
            <div className="qb-subsection">
              <div className="subsection-header">
                <h4>SELECT Columns</h4>
                <button className="btn-small" onClick={addSelectColumn}>
                  + Add Column
                </button>
              </div>
              {selectColumns.map((col, idx) => (
                <div key={idx} className="qb-row">
                  <select
                    value={col.table}
                    onChange={(e) => updateSelectColumn(idx, 'table', e.target.value)}
                  >
                    <option value={selectedTable}>{selectedTable}</option>
                    {joins.map((join) => (
                      <option key={join.table} value={join.table}>
                        {join.table}
                      </option>
                    ))}
                  </select>
                  <select
                    value={col.column}
                    onChange={(e) => updateSelectColumn(idx, 'column', e.target.value)}
                  >
                    <option value="">Select column...</option>
                    {getTableColumns(col.table).map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={col.aggregate || ''}
                    onChange={(e) => updateSelectColumn(idx, 'aggregate', e.target.value)}
                  >
                    <option value="">No aggregate</option>
                    <option value="COUNT">COUNT</option>
                    <option value="SUM">SUM</option>
                    <option value="AVG">AVG</option>
                    <option value="MIN">MIN</option>
                    <option value="MAX">MAX</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Alias (optional)"
                    value={col.alias || ''}
                    onChange={(e) => updateSelectColumn(idx, 'alias', e.target.value)}
                  />
                  <button className="btn-remove" onClick={() => removeSelectColumn(idx)}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* JOINs */}
            <div className="qb-subsection">
              <div className="subsection-header">
                <h4>JOINs</h4>
                <button className="btn-small" onClick={addJoin}>
                  + Add JOIN
                </button>
              </div>
              {joins.map((join, idx) => (
                <div key={idx} className="qb-row">
                  <select
                    value={join.type}
                    onChange={(e) => updateJoin(idx, 'type', e.target.value)}
                  >
                    <option value="INNER">INNER JOIN</option>
                    <option value="LEFT">LEFT JOIN</option>
                    <option value="RIGHT">RIGHT JOIN</option>
                    <option value="FULL">FULL JOIN</option>
                  </select>
                  <select
                    value={join.table}
                    onChange={(e) => updateJoin(idx, 'table', e.target.value)}
                  >
                    <option value="">Select table...</option>
                    {tables
                      .filter((t) => t.name !== selectedTable)
                      .map((table) => (
                        <option key={table.name} value={table.name}>
                          {table.name}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    placeholder="ON condition (e.g., users.id = orders.user_id)"
                    value={join.on}
                    onChange={(e) => updateJoin(idx, 'on', e.target.value)}
                  />
                  <button className="btn-remove" onClick={() => removeJoin(idx)}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* WHERE Conditions */}
            <div className="qb-subsection">
              <div className="subsection-header">
                <h4>WHERE Conditions</h4>
                <button className="btn-small" onClick={addWhereCondition}>
                  + Add Condition
                </button>
              </div>
              {whereConditions.map((cond, idx) => (
                <div key={idx} className="qb-row">
                  {idx > 0 && (
                    <select
                      value={cond.conjunction}
                      onChange={(e) => updateWhereCondition(idx, 'conjunction', e.target.value)}
                      style={{ width: '80px' }}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Column"
                    value={cond.column}
                    onChange={(e) => updateWhereCondition(idx, 'column', e.target.value)}
                  />
                  <select
                    value={cond.operator}
                    onChange={(e) => updateWhereCondition(idx, 'operator', e.target.value)}
                    style={{ width: '80px' }}
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value=">">{'>'}</option>
                    <option value="<">{'<'}</option>
                    <option value=">=">{'>='}</option>
                    <option value="<=">{'<='}</option>
                    <option value="LIKE">LIKE</option>
                    <option value="IN">IN</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    value={cond.value}
                    onChange={(e) => updateWhereCondition(idx, 'value', e.target.value)}
                  />
                  <button className="btn-remove" onClick={() => removeWhereCondition(idx)}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Other Options */}
            <div className="qb-field">
              <label>LIMIT:</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                min="0"
                max="10000"
              />
            </div>
          </>
        )}
      </div>

      {/* Generated SQL Preview */}
      {generatedSQL && (
        <div className="qb-section">
          <h4>Generated SQL</h4>
          <div className="sql-preview">
            <pre>{generatedSQL}</pre>
          </div>
          <button className="btn-primary" onClick={() => onExecute(generatedSQL)}>
            Execute Query
          </button>
        </div>
      )}
    </div>
  );
};

export default QueryBuilder;
