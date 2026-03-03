/**
 * Meadow Migration Manager - Schema Diff Service
 *
 * Compares two DDL-level schemas and produces a structured diff describing
 * the tables, columns, indices, and foreign keys that have been added,
 * removed, or modified between a source schema and a target schema.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Service that compares two DDL-level schemas and returns a structured diff.
 */
class MigrationManagerServiceSchemaDiff extends libFableServiceBase
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

		this.serviceType = 'SchemaDiff';
	}

	/**
	 * Compare two DDL-level schemas and return a structured diff.
	 *
	 * Each schema is expected to have a `Tables` array where each entry has
	 * `TableName`, `Columns`, `Indices`, and `ForeignKeys` properties.
	 *
	 * @param {Object} pSourceSchema - The source (existing) schema
	 * @param {Object} pSourceSchema.Tables - Array of table objects in the source
	 * @param {Object} pTargetSchema - The target (desired) schema
	 * @param {Object} pTargetSchema.Tables - Array of table objects in the target
	 *
	 * @return {Object} A diff result with TablesAdded, TablesRemoved, and TablesModified arrays
	 */
	diffSchemas(pSourceSchema, pTargetSchema)
	{
		let tmpDiffResult = {
			TablesAdded: [],
			TablesRemoved: [],
			TablesModified: []
		};

		let tmpSourceTables = Array.isArray(pSourceSchema.Tables) ? pSourceSchema.Tables : [];
		let tmpTargetTables = Array.isArray(pTargetSchema.Tables) ? pTargetSchema.Tables : [];

		// Build lookup maps by TableName
		let tmpSourceTableMap = {};
		for (let i = 0; i < tmpSourceTables.length; i++)
		{
			tmpSourceTableMap[tmpSourceTables[i].TableName] = tmpSourceTables[i];
		}

		let tmpTargetTableMap = {};
		for (let i = 0; i < tmpTargetTables.length; i++)
		{
			tmpTargetTableMap[tmpTargetTables[i].TableName] = tmpTargetTables[i];
		}

		// Tables in target but not in source are added
		for (let i = 0; i < tmpTargetTables.length; i++)
		{
			if (!tmpSourceTableMap.hasOwnProperty(tmpTargetTables[i].TableName))
			{
				tmpDiffResult.TablesAdded.push(tmpTargetTables[i]);
			}
		}

		// Tables in source but not in target are removed
		for (let i = 0; i < tmpSourceTables.length; i++)
		{
			if (!tmpTargetTableMap.hasOwnProperty(tmpSourceTables[i].TableName))
			{
				tmpDiffResult.TablesRemoved.push(tmpSourceTables[i]);
			}
		}

		// Tables in both require a detailed comparison
		for (let i = 0; i < tmpTargetTables.length; i++)
		{
			let tmpTableName = tmpTargetTables[i].TableName;

			if (tmpSourceTableMap.hasOwnProperty(tmpTableName))
			{
				let tmpTableDiff = this.diffTables(tmpSourceTableMap[tmpTableName], tmpTargetTableMap[tmpTableName]);

				if (this.hasChanges(tmpTableDiff))
				{
					tmpDiffResult.TablesModified.push(tmpTableDiff);
				}
			}
		}

		return tmpDiffResult;
	}

	/**
	 * Compare a single source table to a single target table.
	 *
	 * Produces a detailed diff of columns (added, removed, modified),
	 * indices (added, removed), and foreign keys (added, removed).
	 *
	 * @param {Object} pSourceTable - The source table definition
	 * @param {Object} pSourceTable.TableName - The name of the table
	 * @param {Array}  pSourceTable.Columns - Array of column objects
	 * @param {Array}  pSourceTable.Indices - Array of index objects
	 * @param {Array}  pSourceTable.ForeignKeys - Array of foreign key objects
	 * @param {Object} pTargetTable - The target table definition
	 * @param {Object} pTargetTable.TableName - The name of the table
	 * @param {Array}  pTargetTable.Columns - Array of column objects
	 * @param {Array}  pTargetTable.Indices - Array of index objects
	 * @param {Array}  pTargetTable.ForeignKeys - Array of foreign key objects
	 *
	 * @return {Object} A table-level diff result
	 */
	diffTables(pSourceTable, pTargetTable)
	{
		let tmpTableDiff = {
			TableName: pTargetTable.TableName,
			ColumnsAdded: [],
			ColumnsRemoved: [],
			ColumnsModified: [],
			IndicesAdded: [],
			IndicesRemoved: [],
			ForeignKeysAdded: [],
			ForeignKeysRemoved: []
		};

		// -- Diff columns --
		let tmpSourceColumns = Array.isArray(pSourceTable.Columns) ? pSourceTable.Columns : [];
		let tmpTargetColumns = Array.isArray(pTargetTable.Columns) ? pTargetTable.Columns : [];

		let tmpSourceColumnMap = {};
		for (let i = 0; i < tmpSourceColumns.length; i++)
		{
			tmpSourceColumnMap[tmpSourceColumns[i].Column] = tmpSourceColumns[i];
		}

		let tmpTargetColumnMap = {};
		for (let i = 0; i < tmpTargetColumns.length; i++)
		{
			tmpTargetColumnMap[tmpTargetColumns[i].Column] = tmpTargetColumns[i];
		}

		// Columns in target but not in source
		for (let i = 0; i < tmpTargetColumns.length; i++)
		{
			if (!tmpSourceColumnMap.hasOwnProperty(tmpTargetColumns[i].Column))
			{
				tmpTableDiff.ColumnsAdded.push(tmpTargetColumns[i]);
			}
		}

		// Columns in source but not in target
		for (let i = 0; i < tmpSourceColumns.length; i++)
		{
			if (!tmpTargetColumnMap.hasOwnProperty(tmpSourceColumns[i].Column))
			{
				tmpTableDiff.ColumnsRemoved.push(tmpSourceColumns[i]);
			}
		}

		// Columns in both -- check for property-level modifications
		for (let i = 0; i < tmpTargetColumns.length; i++)
		{
			let tmpColumnName = tmpTargetColumns[i].Column;

			if (tmpSourceColumnMap.hasOwnProperty(tmpColumnName))
			{
				let tmpSourceCol = tmpSourceColumnMap[tmpColumnName];
				let tmpTargetCol = tmpTargetColumnMap[tmpColumnName];
				let tmpChanges = {};
				let tmpHasColumnChanges = false;

				// Compare DataType
				if (tmpSourceCol.DataType !== tmpTargetCol.DataType)
				{
					tmpChanges.DataType = { From: tmpSourceCol.DataType, To: tmpTargetCol.DataType };
					tmpHasColumnChanges = true;
				}

				// Compare Size
				let tmpSourceSize = tmpSourceCol.hasOwnProperty('Size') ? tmpSourceCol.Size : undefined;
				let tmpTargetSize = tmpTargetCol.hasOwnProperty('Size') ? tmpTargetCol.Size : undefined;
				if (tmpSourceSize !== tmpTargetSize)
				{
					tmpChanges.Size = { From: tmpSourceSize, To: tmpTargetSize };
					tmpHasColumnChanges = true;
				}

				// Compare Indexed
				let tmpSourceIndexed = tmpSourceCol.hasOwnProperty('Indexed') ? tmpSourceCol.Indexed : undefined;
				let tmpTargetIndexed = tmpTargetCol.hasOwnProperty('Indexed') ? tmpTargetCol.Indexed : undefined;
				if (tmpSourceIndexed !== tmpTargetIndexed)
				{
					tmpChanges.Indexed = { From: tmpSourceIndexed, To: tmpTargetIndexed };
					tmpHasColumnChanges = true;
				}

				// Compare IndexName
				let tmpSourceIndexName = tmpSourceCol.hasOwnProperty('IndexName') ? tmpSourceCol.IndexName : undefined;
				let tmpTargetIndexName = tmpTargetCol.hasOwnProperty('IndexName') ? tmpTargetCol.IndexName : undefined;
				if (tmpSourceIndexName !== tmpTargetIndexName)
				{
					tmpChanges.IndexName = { From: tmpSourceIndexName, To: tmpTargetIndexName };
					tmpHasColumnChanges = true;
				}

				if (tmpHasColumnChanges)
				{
					tmpTableDiff.ColumnsModified.push({
						Column: tmpColumnName,
						Changes: tmpChanges
					});
				}
			}
		}

		// -- Diff indices --
		let tmpSourceIndices = Array.isArray(pSourceTable.Indices) ? pSourceTable.Indices : [];
		let tmpTargetIndices = Array.isArray(pTargetTable.Indices) ? pTargetTable.Indices : [];

		let tmpSourceIndexMap = {};
		for (let i = 0; i < tmpSourceIndices.length; i++)
		{
			tmpSourceIndexMap[tmpSourceIndices[i].Name] = tmpSourceIndices[i];
		}

		let tmpTargetIndexMap = {};
		for (let i = 0; i < tmpTargetIndices.length; i++)
		{
			tmpTargetIndexMap[tmpTargetIndices[i].Name] = tmpTargetIndices[i];
		}

		// Indices in target but not in source
		for (let i = 0; i < tmpTargetIndices.length; i++)
		{
			if (!tmpSourceIndexMap.hasOwnProperty(tmpTargetIndices[i].Name))
			{
				tmpTableDiff.IndicesAdded.push(tmpTargetIndices[i]);
			}
		}

		// Indices in source but not in target
		for (let i = 0; i < tmpSourceIndices.length; i++)
		{
			if (!tmpTargetIndexMap.hasOwnProperty(tmpSourceIndices[i].Name))
			{
				tmpTableDiff.IndicesRemoved.push(tmpSourceIndices[i]);
			}
		}

		// -- Diff foreign keys --
		let tmpSourceForeignKeys = Array.isArray(pSourceTable.ForeignKeys) ? pSourceTable.ForeignKeys : [];
		let tmpTargetForeignKeys = Array.isArray(pTargetTable.ForeignKeys) ? pTargetTable.ForeignKeys : [];

		let tmpSourceFKMap = {};
		for (let i = 0; i < tmpSourceForeignKeys.length; i++)
		{
			tmpSourceFKMap[tmpSourceForeignKeys[i].Column] = tmpSourceForeignKeys[i];
		}

		let tmpTargetFKMap = {};
		for (let i = 0; i < tmpTargetForeignKeys.length; i++)
		{
			tmpTargetFKMap[tmpTargetForeignKeys[i].Column] = tmpTargetForeignKeys[i];
		}

		// Foreign keys in target but not in source
		for (let i = 0; i < tmpTargetForeignKeys.length; i++)
		{
			if (!tmpSourceFKMap.hasOwnProperty(tmpTargetForeignKeys[i].Column))
			{
				tmpTableDiff.ForeignKeysAdded.push(tmpTargetForeignKeys[i]);
			}
		}

		// Foreign keys in source but not in target
		for (let i = 0; i < tmpSourceForeignKeys.length; i++)
		{
			if (!tmpTargetFKMap.hasOwnProperty(tmpSourceForeignKeys[i].Column))
			{
				tmpTableDiff.ForeignKeysRemoved.push(tmpSourceForeignKeys[i]);
			}
		}

		return tmpTableDiff;
	}

	/**
	 * Check whether a table diff object contains any changes.
	 *
	 * @param {Object} pTableDiff - A table diff result from diffTables()
	 *
	 * @return {boolean} True if any of the diff arrays have entries
	 */
	hasChanges(pTableDiff)
	{
		return (
			(pTableDiff.ColumnsAdded.length > 0) ||
			(pTableDiff.ColumnsRemoved.length > 0) ||
			(pTableDiff.ColumnsModified.length > 0) ||
			(pTableDiff.IndicesAdded.length > 0) ||
			(pTableDiff.IndicesRemoved.length > 0) ||
			(pTableDiff.ForeignKeysAdded.length > 0) ||
			(pTableDiff.ForeignKeysRemoved.length > 0)
		);
	}
}

module.exports = MigrationManagerServiceSchemaDiff;

/** @type {Record<string, any>} */
MigrationManagerServiceSchemaDiff.default_configuration = {};
