/**
 * Meadow Migration Manager - Flow Data Builder Service
 *
 * Converts compiled DDL schemas into pict-section-flow data structures
 * for interactive graph visualization.  Each database table becomes a
 * flow node with ports for columns involved in foreign key relationships.
 * FK connections are rendered as edges between specific field-level ports.
 *
 * The conversion algorithm:
 *   1. Normalize the Tables input (hash or array)
 *   2. Scan all FKs to build a set of "referenced" columns
 *   3. For each table, create a flow Node with column-level ports
 *   4. For each FK relationship, create a Connection between ports
 *   5. Auto-layout tables in a grid pattern
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Column height in pixels inside a table node.
 * @type {number}
 */
const COLUMN_ROW_HEIGHT = 22;

/**
 * Title bar height in pixels for each table node.
 * @type {number}
 */
const TITLE_BAR_HEIGHT = 28;

/**
 * Default node width in pixels.
 * @type {number}
 */
const DEFAULT_NODE_WIDTH = 260;

/**
 * Horizontal spacing between table nodes in auto-layout.
 * @type {number}
 */
const LAYOUT_HORIZONTAL_GAP = 320;

/**
 * Vertical spacing between table nodes in auto-layout.
 * @type {number}
 */
const LAYOUT_VERTICAL_GAP = 40;

/**
 * Maximum number of tables per row in auto-layout grid.
 * @type {number}
 */
const LAYOUT_MAX_COLUMNS = 4;

/**
 * Starting X offset for auto-layout.
 * @type {number}
 */
const LAYOUT_START_X = 50;

/**
 * Starting Y offset for auto-layout.
 * @type {number}
 */
const LAYOUT_START_Y = 50;

/**
 * Service that converts compiled DDL schemas to pict-section-flow data.
 */
class MigrationManagerServiceFlowDataBuilder extends libFableServiceBase
{
	/**
	 * @param {Object} pFable - The Fable Framework instance
	 * @param {Object} pOptions - The options for the service
	 * @param {String} pServiceHash - The hash of the service
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		/** @type {any} */
		this.log;

		this.serviceType = 'FlowDataBuilder';
	}

	/**
	 * Normalize the Tables property from a compiled schema.
	 *
	 * Stricture's Extended JSON returns Tables as a hash keyed by table name,
	 * while the SchemaVisualizer and SchemaDiff use Tables as an array.
	 * This method accepts either format and always returns an array.
	 *
	 * @param {Object|Array} pTables - Tables hash or array
	 *
	 * @return {Array} An array of table objects
	 */
	_normalizeTables(pTables)
	{
		if (Array.isArray(pTables))
		{
			return pTables;
		}

		if (pTables && typeof pTables === 'object')
		{
			let tmpTableKeys = Object.keys(pTables);
			let tmpTables = [];

			for (let i = 0; i < tmpTableKeys.length; i++)
			{
				tmpTables.push(pTables[tmpTableKeys[i]]);
			}

			return tmpTables;
		}

		return [];
	}

	/**
	 * Build the set of columns that are referenced by foreign keys from
	 * other tables.  These columns will receive input ports.
	 *
	 * @param {Array} pTables - Array of table objects
	 *
	 * @return {Object} Hash of "TableName.ColumnName" → true
	 */
	_getReferencedColumnSet(pTables)
	{
		let tmpReferenced = {};

		for (let i = 0; i < pTables.length; i++)
		{
			let tmpTable = pTables[i];
			let tmpForeignKeys = Array.isArray(tmpTable.ForeignKeys) ? tmpTable.ForeignKeys : [];

			for (let j = 0; j < tmpForeignKeys.length; j++)
			{
				let tmpFK = tmpForeignKeys[j];
				let tmpRefTable = tmpFK.ReferencesTable || '';
				let tmpRefColumn = tmpFK.ReferencesColumn || '';

				if (tmpRefTable && tmpRefColumn)
				{
					tmpReferenced[tmpRefTable + '.' + tmpRefColumn] = true;
				}
			}

			// Also scan columns with DataType === 'ForeignKey' and Join property
			// as a fallback when ForeignKeys array is absent
			if (tmpForeignKeys.length === 0)
			{
				let tmpColumns = Array.isArray(tmpTable.Columns) ? tmpTable.Columns : [];

				for (let j = 0; j < tmpColumns.length; j++)
				{
					let tmpCol = tmpColumns[j];

					if (tmpCol.DataType === 'ForeignKey' && tmpCol.Join)
					{
						// Join format is the column name of the referenced PK
						// We need to find which table owns that column
						// Convention: the Join value is the PK column name (e.g. "IDBook")
						// and a table named by stripping the "ID" prefix would be the target
						let tmpJoinColumn = tmpCol.Join;

						// Search other tables for the referenced column
						for (let k = 0; k < pTables.length; k++)
						{
							if (k === i)
							{
								continue;
							}

							let tmpOtherTable = pTables[k];
							let tmpOtherCols = Array.isArray(tmpOtherTable.Columns) ? tmpOtherTable.Columns : [];

							for (let m = 0; m < tmpOtherCols.length; m++)
							{
								if (tmpOtherCols[m].Column === tmpJoinColumn && tmpOtherCols[m].DataType === 'ID')
								{
									tmpReferenced[tmpOtherTable.TableName + '.' + tmpJoinColumn] = true;
								}
							}
						}
					}
				}
			}
		}

		return tmpReferenced;
	}

	/**
	 * Build the set of FK columns in a table.  Returns a hash keyed by
	 * column name for quick lookup.
	 *
	 * @param {Object} pTable - A single table object
	 *
	 * @return {Object} Hash of ColumnName → FK definition
	 */
	_getForeignKeyColumns(pTable)
	{
		let tmpFKColumns = {};
		let tmpForeignKeys = Array.isArray(pTable.ForeignKeys) ? pTable.ForeignKeys : [];

		for (let i = 0; i < tmpForeignKeys.length; i++)
		{
			tmpFKColumns[tmpForeignKeys[i].Column] = tmpForeignKeys[i];
		}

		// Fallback: scan columns with DataType === 'ForeignKey'
		if (tmpForeignKeys.length === 0)
		{
			let tmpColumns = Array.isArray(pTable.Columns) ? pTable.Columns : [];

			for (let i = 0; i < tmpColumns.length; i++)
			{
				if (tmpColumns[i].DataType === 'ForeignKey')
				{
					tmpFKColumns[tmpColumns[i].Column] =
					{
						Column: tmpColumns[i].Column,
						ReferencesColumn: tmpColumns[i].Join || tmpColumns[i].Column,
						// ReferencesTable will be resolved later
						_JoinColumn: tmpColumns[i].Join || tmpColumns[i].Column
					};
				}
			}
		}

		return tmpFKColumns;
	}

	/**
	 * Get the data type abbreviation for display in node body content.
	 *
	 * @param {Object} pColumn - A column object
	 *
	 * @return {string} Abbreviated type string
	 */
	_getTypeDisplay(pColumn)
	{
		let tmpDataType = pColumn.DataType || 'Unknown';

		switch (tmpDataType)
		{
			case 'ID':
				return 'PK';
			case 'ForeignKey':
				return 'FK';
			case 'String':
				return pColumn.Size ? 'STR(' + pColumn.Size + ')' : 'STR';
			case 'Numeric':
				return 'INT';
			case 'Decimal':
				return pColumn.Size ? 'DEC(' + pColumn.Size + ')' : 'DEC';
			case 'DateTime':
				return 'DT';
			case 'Text':
				return 'TXT';
			case 'Boolean':
				return 'BOOL';
			case 'GUID':
				return 'GUID';
			default:
				return tmpDataType;
		}
	}

	/**
	 * Build a single flow node for a table.
	 *
	 * @param {Object} pTable - A table object with TableName, Columns, ForeignKeys
	 * @param {number} pIndex - Index of this table (used for auto-layout positioning)
	 * @param {Object} pReferencedColumns - Hash of "TableName.ColumnName" → true
	 *
	 * @return {Object} A pict-section-flow node object
	 */
	_buildTableNode(pTable, pIndex, pReferencedColumns)
	{
		let tmpTableName = pTable.TableName || 'Unknown';
		let tmpColumns = Array.isArray(pTable.Columns) ? pTable.Columns : [];
		let tmpFKColumns = this._getForeignKeyColumns(pTable);

		// Auto-layout position: grid pattern
		let tmpCol = pIndex % LAYOUT_MAX_COLUMNS;
		let tmpRow = Math.floor(pIndex / LAYOUT_MAX_COLUMNS);
		let tmpX = LAYOUT_START_X + (tmpCol * LAYOUT_HORIZONTAL_GAP);
		let tmpY = LAYOUT_START_Y + (tmpRow * (300 + LAYOUT_VERTICAL_GAP));

		// Calculate dynamic height based on column count
		let tmpHeight = TITLE_BAR_HEIGHT + (tmpColumns.length * COLUMN_ROW_HEIGHT) + 10;
		if (tmpHeight < 60)
		{
			tmpHeight = 60;
		}

		// Build ports for FK and referenced columns
		let tmpPorts = [];

		for (let i = 0; i < tmpColumns.length; i++)
		{
			let tmpColName = tmpColumns[i].Column;
			let tmpIsFK = tmpFKColumns.hasOwnProperty(tmpColName);
			let tmpIsReferenced = pReferencedColumns.hasOwnProperty(tmpTableName + '.' + tmpColName);

			// FK columns get output ports on the right
			if (tmpIsFK)
			{
				tmpPorts.push(
				{
					Hash: 'port-' + tmpTableName + '-' + tmpColName + '-out',
					Direction: 'output',
					Side: 'right',
					Label: tmpColName
				});
			}

			// Referenced columns (PKs pointed to by FKs) get input ports on the left
			if (tmpIsReferenced)
			{
				tmpPorts.push(
				{
					Hash: 'port-' + tmpTableName + '-' + tmpColName + '-in',
					Direction: 'input',
					Side: 'left',
					Label: tmpColName
				});
			}
		}

		// Build column data for body content rendering
		let tmpColumnData = [];

		for (let i = 0; i < tmpColumns.length; i++)
		{
			tmpColumnData.push(
			{
				Column: tmpColumns[i].Column,
				DataType: tmpColumns[i].DataType,
				Size: tmpColumns[i].Size,
				TypeDisplay: this._getTypeDisplay(tmpColumns[i]),
				IsFK: tmpFKColumns.hasOwnProperty(tmpColumns[i].Column),
				IsReferenced: pReferencedColumns.hasOwnProperty(tmpTableName + '.' + tmpColumns[i].Column)
			});
		}

		return {
			Hash: 'table-' + tmpTableName,
			Type: 'TABLE',
			X: tmpX,
			Y: tmpY,
			Width: DEFAULT_NODE_WIDTH,
			Height: tmpHeight,
			Title: tmpTableName,
			Ports: tmpPorts,
			Data:
			{
				TableName: tmpTableName,
				Columns: tmpColumnData
			}
		};
	}

	/**
	 * Build connections for all FK relationships across tables.
	 *
	 * @param {Array} pTables - Array of table objects
	 *
	 * @return {Array} Array of pict-section-flow connection objects
	 */
	_buildConnections(pTables)
	{
		let tmpConnections = [];
		let tmpConnIndex = 0;

		for (let i = 0; i < pTables.length; i++)
		{
			let tmpTable = pTables[i];
			let tmpTableName = tmpTable.TableName || 'Unknown';
			let tmpForeignKeys = Array.isArray(tmpTable.ForeignKeys) ? tmpTable.ForeignKeys : [];

			// Use explicit ForeignKeys array
			for (let j = 0; j < tmpForeignKeys.length; j++)
			{
				let tmpFK = tmpForeignKeys[j];
				let tmpSourceColumn = tmpFK.Column || '';
				let tmpTargetTable = tmpFK.ReferencesTable || '';
				let tmpTargetColumn = tmpFK.ReferencesColumn || '';

				if (tmpSourceColumn && tmpTargetTable && tmpTargetColumn)
				{
					tmpConnections.push(
					{
						Hash: 'fk-conn-' + tmpConnIndex,
						SourceNodeHash: 'table-' + tmpTableName,
						SourcePortHash: 'port-' + tmpTableName + '-' + tmpSourceColumn + '-out',
						TargetNodeHash: 'table-' + tmpTargetTable,
						TargetPortHash: 'port-' + tmpTargetTable + '-' + tmpTargetColumn + '-in',
						Data:
						{
							Type: 'ForeignKey',
							SourceTable: tmpTableName,
							SourceColumn: tmpSourceColumn,
							TargetTable: tmpTargetTable,
							TargetColumn: tmpTargetColumn
						}
					});
					tmpConnIndex++;
				}
			}

			// Fallback: use columns with DataType === 'ForeignKey' and Join
			if (tmpForeignKeys.length === 0)
			{
				let tmpColumns = Array.isArray(tmpTable.Columns) ? tmpTable.Columns : [];

				for (let j = 0; j < tmpColumns.length; j++)
				{
					let tmpCol = tmpColumns[j];

					if (tmpCol.DataType === 'ForeignKey' && tmpCol.Join)
					{
						let tmpJoinColumn = tmpCol.Join;

						// Find the target table by searching for the PK column
						for (let k = 0; k < pTables.length; k++)
						{
							if (k === i)
							{
								continue;
							}

							let tmpOtherTable = pTables[k];
							let tmpOtherCols = Array.isArray(tmpOtherTable.Columns) ? tmpOtherTable.Columns : [];

							for (let m = 0; m < tmpOtherCols.length; m++)
							{
								if (tmpOtherCols[m].Column === tmpJoinColumn && tmpOtherCols[m].DataType === 'ID')
								{
									tmpConnections.push(
									{
										Hash: 'fk-conn-' + tmpConnIndex,
										SourceNodeHash: 'table-' + tmpTableName,
										SourcePortHash: 'port-' + tmpTableName + '-' + tmpCol.Column + '-out',
										TargetNodeHash: 'table-' + tmpOtherTable.TableName,
										TargetPortHash: 'port-' + tmpOtherTable.TableName + '-' + tmpJoinColumn + '-in',
										Data:
										{
											Type: 'ForeignKey',
											SourceTable: tmpTableName,
											SourceColumn: tmpCol.Column,
											TargetTable: tmpOtherTable.TableName,
											TargetColumn: tmpJoinColumn
										}
									});
									tmpConnIndex++;
								}
							}
						}
					}
				}
			}
		}

		return tmpConnections;
	}

	/**
	 * Build a complete pict-section-flow data structure from a compiled schema.
	 *
	 * Accepts compiled schemas where Tables is either a hash (Stricture Extended
	 * JSON output) or an array (normalized format used by other services).
	 *
	 * @param {Object} pCompiledSchema - A compiled DDL schema with Tables
	 *
	 * @return {Object} A pict-section-flow data object with Nodes, Connections, ViewState
	 */
	buildFlowData(pCompiledSchema)
	{
		if (!pCompiledSchema || !pCompiledSchema.Tables)
		{
			this.log.warn('FlowDataBuilder: No Tables found in compiled schema.');
			return {
				Nodes: [],
				Connections: [],
				ViewState: { PanX: 0, PanY: 0, Zoom: 1, SelectedNodeHash: null, SelectedConnectionHash: null }
			};
		}

		let tmpTables = this._normalizeTables(pCompiledSchema.Tables);

		// First pass: identify all referenced columns
		let tmpReferencedColumns = this._getReferencedColumnSet(tmpTables);

		// Second pass: build nodes
		let tmpNodes = [];

		for (let i = 0; i < tmpTables.length; i++)
		{
			tmpNodes.push(this._buildTableNode(tmpTables[i], i, tmpReferencedColumns));
		}

		// Third pass: build connections
		let tmpConnections = this._buildConnections(tmpTables);

		this.log.info('FlowDataBuilder: Generated ' + tmpNodes.length + ' node(s) and ' + tmpConnections.length + ' connection(s).');

		return {
			Nodes: tmpNodes,
			Connections: tmpConnections,
			ViewState:
			{
				PanX: 0,
				PanY: 0,
				Zoom: 1,
				SelectedNodeHash: null,
				SelectedConnectionHash: null
			}
		};
	}

	/**
	 * Build flow data with color-coded nodes based on a schema diff result.
	 *
	 * Nodes for added tables get green title bars, removed tables get red,
	 * modified tables get yellow, and unchanged tables get default styling.
	 *
	 * @param {Object} pCompiledSchema - The target compiled schema
	 * @param {Object} pDiffResult - A diff result from SchemaDiff.diffSchemas()
	 *
	 * @return {Object} A pict-section-flow data object with diff-colored nodes
	 */
	buildDiffFlowData(pCompiledSchema, pDiffResult)
	{
		let tmpFlowData = this.buildFlowData(pCompiledSchema);

		if (!pDiffResult)
		{
			return tmpFlowData;
		}

		// Build lookup sets for diff classification
		let tmpAddedTables = {};
		let tmpRemovedTables = {};
		let tmpModifiedTables = {};

		if (Array.isArray(pDiffResult.TablesAdded))
		{
			for (let i = 0; i < pDiffResult.TablesAdded.length; i++)
			{
				let tmpName = pDiffResult.TablesAdded[i].TableName || pDiffResult.TablesAdded[i];
				tmpAddedTables[tmpName] = true;
			}
		}

		if (Array.isArray(pDiffResult.TablesRemoved))
		{
			for (let i = 0; i < pDiffResult.TablesRemoved.length; i++)
			{
				let tmpName = pDiffResult.TablesRemoved[i].TableName || pDiffResult.TablesRemoved[i];
				tmpRemovedTables[tmpName] = true;
			}
		}

		if (Array.isArray(pDiffResult.TablesModified))
		{
			for (let i = 0; i < pDiffResult.TablesModified.length; i++)
			{
				tmpModifiedTables[pDiffResult.TablesModified[i].TableName] = true;
			}
		}

		// Apply diff colors to each node
		for (let i = 0; i < tmpFlowData.Nodes.length; i++)
		{
			let tmpNode = tmpFlowData.Nodes[i];
			let tmpTableName = tmpNode.Data ? tmpNode.Data.TableName : '';

			if (tmpAddedTables[tmpTableName])
			{
				tmpNode.Data.DiffStatus = 'Added';
				tmpNode.Type = 'TABLE_ADDED';
			}
			else if (tmpRemovedTables[tmpTableName])
			{
				tmpNode.Data.DiffStatus = 'Removed';
				tmpNode.Type = 'TABLE_REMOVED';
			}
			else if (tmpModifiedTables[tmpTableName])
			{
				tmpNode.Data.DiffStatus = 'Modified';
				tmpNode.Type = 'TABLE_MODIFIED';
			}
			else
			{
				tmpNode.Data.DiffStatus = 'Unchanged';
			}
		}

		return tmpFlowData;
	}
}

module.exports = MigrationManagerServiceFlowDataBuilder;

/** @type {Record<string, any>} */
MigrationManagerServiceFlowDataBuilder.default_configuration = {};
