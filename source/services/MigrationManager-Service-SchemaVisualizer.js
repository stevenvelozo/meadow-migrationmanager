/**
 * Meadow Migration Manager - Schema Visualizer Service
 *
 * Produces text-based schema visualizations from DDL-level compiled schemas.
 * All methods are synchronous and operate on compiled schema objects (the
 * output of StrictureAdapter.compile()), returning formatted strings suitable
 * for console output or embedding in documentation.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Service that produces text-based schema visualizations.
 */
class MigrationManagerServiceSchemaVisualizer extends libFableServiceBase
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

		this.serviceType = 'SchemaVisualizer';
	}

	/**
	 * Generate a formatted list of all tables with column counts.
	 *
	 * Produces output in the format:
	 *   Tables (5):
	 *     Book          (7 columns)
	 *     Author        (2 columns)
	 *
	 * @param {Object} pCompiledSchema - A compiled DDL schema with a Tables array
	 * @param {Array}  pCompiledSchema.Tables - Array of table objects
	 *
	 * @return {string} A formatted table list string
	 */
	generateTableList(pCompiledSchema)
	{
		let tmpTables = this._normalizeTables(pCompiledSchema);
		let tmpLines = [];

		tmpLines.push(`Tables (${tmpTables.length}):`);

		for (let i = 0; i < tmpTables.length; i++)
		{
			let tmpTable = tmpTables[i];
			let tmpTableName = tmpTable.TableName || 'Unknown';
			let tmpColumns = Array.isArray(tmpTable.Columns) ? tmpTable.Columns : [];
			let tmpColumnCount = tmpColumns.length;

			tmpLines.push(`  ${tmpTableName.padEnd(20)}(${tmpColumnCount} column${tmpColumnCount !== 1 ? 's' : ''})`);
		}

		return tmpLines.join('\n');
	}

	/**
	 * Generate a formatted detail view of a single table's columns.
	 *
	 * Produces output in the format:
	 *   Table: Book
	 *     IDBook           ID
	 *     Title            String(200)
	 *     Genre            String(128)
	 *     PublicationYear  Numeric
	 *
	 * @param {Object} pTableSchema - A single table schema object
	 * @param {string} pTableSchema.TableName - The name of the table
	 * @param {Array}  pTableSchema.Columns - Array of column objects
	 *
	 * @return {string} A formatted table detail string
	 */
	generateTableDetail(pTableSchema)
	{
		let tmpTableName = pTableSchema.TableName || 'Unknown';
		let tmpColumns = Array.isArray(pTableSchema.Columns) ? pTableSchema.Columns : [];
		let tmpLines = [];

		tmpLines.push(`Table: ${tmpTableName}`);

		for (let i = 0; i < tmpColumns.length; i++)
		{
			let tmpColumn = tmpColumns[i];
			let tmpColumnName = tmpColumn.Column || 'Unknown';
			let tmpDataType = tmpColumn.DataType || 'Unknown';

			let tmpTypeDisplay = tmpDataType;

			if (tmpColumn.hasOwnProperty('Size') && tmpColumn.Size)
			{
				tmpTypeDisplay = `${tmpDataType}(${tmpColumn.Size})`;
			}

			tmpLines.push(`  ${tmpColumnName.padEnd(20)}${tmpTypeDisplay}`);
		}

		return tmpLines.join('\n');
	}

	/**
	 * Resolve all relationships for a table, including explicit ForeignKeys
	 * and inferred joins from column-level Join (-> syntax) and TableJoin
	 * (=> syntax) properties.
	 *
	 * @param {Object} pTable - A single table object
	 * @param {Array}  pAllTables - All tables in the schema (for resolving Join targets)
	 *
	 * @return {Array} Array of { Column, ReferencesTable, ReferencesColumn } objects
	 */
	_resolveTableRelationships(pTable, pAllTables)
	{
		let tmpRelationships = [];
		let tmpForeignKeys = Array.isArray(pTable.ForeignKeys) ? pTable.ForeignKeys : [];
		let tmpColumns = Array.isArray(pTable.Columns) ? pTable.Columns : [];
		let tmpResolvedColumns = {};

		// First: add explicit ForeignKeys entries
		for (let i = 0; i < tmpForeignKeys.length; i++)
		{
			let tmpFK = tmpForeignKeys[i];
			tmpRelationships.push(tmpFK);
			tmpResolvedColumns[tmpFK.Column] = true;
		}

		// Second: infer from column-level Join property (-> syntax)
		for (let i = 0; i < tmpColumns.length; i++)
		{
			let tmpCol = tmpColumns[i];

			// Skip columns already resolved via explicit ForeignKeys
			if (tmpResolvedColumns[tmpCol.Column])
			{
				continue;
			}

			if (tmpCol.Join)
			{
				let tmpJoinColumn = tmpCol.Join;

				// Search all tables for the referenced PK column
				for (let k = 0; k < pAllTables.length; k++)
				{
					let tmpOtherTable = pAllTables[k];

					if (tmpOtherTable.TableName === pTable.TableName)
					{
						continue;
					}

					let tmpOtherCols = Array.isArray(tmpOtherTable.Columns) ? tmpOtherTable.Columns : [];

					for (let m = 0; m < tmpOtherCols.length; m++)
					{
						if (tmpOtherCols[m].Column === tmpJoinColumn && tmpOtherCols[m].DataType === 'ID')
						{
							tmpRelationships.push(
							{
								Column: tmpCol.Column,
								ReferencesTable: tmpOtherTable.TableName,
								ReferencesColumn: tmpJoinColumn
							});
							tmpResolvedColumns[tmpCol.Column] = true;
						}
					}
				}
			}

			// Handle TableJoin (=> syntax) — table-level join without column specificity
			if (tmpCol.TableJoin && !tmpResolvedColumns[tmpCol.Column])
			{
				tmpRelationships.push(
				{
					Column: tmpCol.Column,
					ReferencesTable: tmpCol.TableJoin,
					ReferencesColumn: ''
				});
				tmpResolvedColumns[tmpCol.Column] = true;
			}
		}

		return tmpRelationships;
	}

	/**
	 * Generate a formatted map of relationships between tables.
	 *
	 * Detects relationships from three sources:
	 *   1. Explicit ForeignKeys arrays on table objects
	 *   2. Column-level Join properties (from MicroDDL -> syntax)
	 *   3. Column-level TableJoin properties (from MicroDDL => syntax)
	 *
	 * Produces output in the format:
	 *   Relationships:
	 *     BookAuthorJoin.IDBook    -> Book.IDBook
	 *     BookAuthorJoin.IDAuthor  -> Author.IDAuthor
	 *
	 * Returns "No relationships found." if none exist.
	 *
	 * @param {Object} pCompiledSchema - A compiled DDL schema with a Tables array or hash
	 * @param {Array|Object} pCompiledSchema.Tables - Array or hash of table objects
	 *
	 * @return {string} A formatted relationship map string
	 */
	generateRelationshipMap(pCompiledSchema)
	{
		let tmpTables = this._normalizeTables(pCompiledSchema);
		let tmpRelationships = [];

		for (let i = 0; i < tmpTables.length; i++)
		{
			let tmpTable = tmpTables[i];
			let tmpTableName = tmpTable.TableName || 'Unknown';
			let tmpResolved = this._resolveTableRelationships(tmpTable, tmpTables);

			for (let j = 0; j < tmpResolved.length; j++)
			{
				let tmpFK = tmpResolved[j];
				let tmpSourceColumn = tmpFK.Column || 'Unknown';
				let tmpTargetTable = tmpFK.ReferencesTable || 'Unknown';
				let tmpTargetColumn = tmpFK.ReferencesColumn || '';

				let tmpTarget = tmpTargetColumn ? `${tmpTargetTable}.${tmpTargetColumn}` : tmpTargetTable;

				tmpRelationships.push(
				{
					Source: `${tmpTableName}.${tmpSourceColumn}`,
					Target: tmpTarget
				});
			}
		}

		if (tmpRelationships.length === 0)
		{
			return 'No relationships found.';
		}

		let tmpLines = [];
		tmpLines.push('Relationships:');

		for (let i = 0; i < tmpRelationships.length; i++)
		{
			let tmpRel = tmpRelationships[i];
			tmpLines.push(`  ${tmpRel.Source.padEnd(30)}-> ${tmpRel.Target}`);
		}

		return tmpLines.join('\n');
	}

	/**
	 * Normalize the Tables property from a compiled schema.
	 *
	 * Stricture's Extended JSON returns Tables as a hash keyed by table name,
	 * while normalized schemas use Tables as an array. This method accepts
	 * either format and always returns an array.
	 *
	 * @param {Object} pCompiledSchema - A compiled schema with Tables
	 *
	 * @return {Array} An array of table objects
	 */
	_normalizeTables(pCompiledSchema)
	{
		let tmpTables = pCompiledSchema ? pCompiledSchema.Tables : [];

		if (Array.isArray(tmpTables))
		{
			return tmpTables;
		}

		if (tmpTables && typeof tmpTables === 'object')
		{
			let tmpTableKeys = Object.keys(tmpTables);
			let tmpResult = [];

			for (let i = 0; i < tmpTableKeys.length; i++)
			{
				tmpResult.push(tmpTables[tmpTableKeys[i]]);
			}

			return tmpResult;
		}

		return [];
	}

	/**
	 * Get the abbreviated type code for a DataType string.
	 *
	 * @param {string} pDataType - The DataType value from a column definition
	 *
	 * @return {string} The abbreviated type code
	 */
	_getTypeAbbreviation(pDataType)
	{
		switch (pDataType)
		{
			case 'ID':
				return '[PK]';
			case 'String':
				return 'STR';
			case 'Numeric':
				return 'NUM';
			case 'Decimal':
				return 'DEC';
			case 'DateTime':
				return 'DT';
			case 'Text':
				return 'TXT';
			case 'Boolean':
				return 'BOL';
			case 'ForeignKey':
				return 'FK';
			case 'GUID':
				return 'GID';
			default:
				return pDataType || '???';
		}
	}

	/**
	 * Generate an ASCII box diagram of all tables in the schema.
	 *
	 * Produces output in the format:
	 *   +------------------+
	 *   | Book             |
	 *   +------------------+
	 *   | IDBook       [PK]|
	 *   | Title        STR |
	 *   | Genre        STR |
	 *   +------------------+
	 *
	 * Uses a consistent box width per table based on the longest column name
	 * and type abbreviation plus padding.
	 *
	 * @param {Object} pCompiledSchema - A compiled DDL schema with a Tables array
	 * @param {Array}  pCompiledSchema.Tables - Array of table objects
	 *
	 * @return {string} A formatted ASCII diagram string
	 */
	generateASCIIDiagram(pCompiledSchema)
	{
		let tmpTables = this._normalizeTables(pCompiledSchema);
		let tmpDiagramParts = [];

		for (let i = 0; i < tmpTables.length; i++)
		{
			let tmpTable = tmpTables[i];
			let tmpTableName = tmpTable.TableName || 'Unknown';
			let tmpColumns = Array.isArray(tmpTable.Columns) ? tmpTable.Columns : [];

			// Calculate the minimum inner width based on table name and columns
			let tmpMinWidth = tmpTableName.length + 2;

			for (let j = 0; j < tmpColumns.length; j++)
			{
				let tmpColumnName = tmpColumns[j].Column || 'Unknown';
				let tmpTypeAbbr = this._getTypeAbbreviation(tmpColumns[j].DataType);
				// Column line: "| {name} {type}|"  with at least one space between name and type
				let tmpColumnLineWidth = tmpColumnName.length + 1 + tmpTypeAbbr.length + 1;

				if (tmpColumnLineWidth > tmpMinWidth)
				{
					tmpMinWidth = tmpColumnLineWidth;
				}
			}

			let tmpInnerWidth = tmpMinWidth;
			let tmpBorderLine = '+' + '-'.repeat(tmpInnerWidth) + '+';

			let tmpTableLines = [];

			// Header
			tmpTableLines.push(tmpBorderLine);
			tmpTableLines.push('| ' + tmpTableName.padEnd(tmpInnerWidth - 1) + '|');
			tmpTableLines.push(tmpBorderLine);

			// Columns
			for (let j = 0; j < tmpColumns.length; j++)
			{
				let tmpColumnName = tmpColumns[j].Column || 'Unknown';
				let tmpTypeAbbr = this._getTypeAbbreviation(tmpColumns[j].DataType);
				// Right-align the type abbreviation within the box
				let tmpContentWidth = tmpInnerWidth - 1; // subtract 1 for leading space in "| "
				let tmpContent = tmpColumnName.padEnd(tmpContentWidth - tmpTypeAbbr.length) + tmpTypeAbbr;
				tmpTableLines.push('| ' + tmpContent + '|');
			}

			// Footer
			tmpTableLines.push(tmpBorderLine);

			tmpDiagramParts.push(tmpTableLines.join('\n'));
		}

		return tmpDiagramParts.join('\n\n');
	}
}

module.exports = MigrationManagerServiceSchemaVisualizer;

/** @type {Record<string, any>} */
MigrationManagerServiceSchemaVisualizer.default_configuration = {};
