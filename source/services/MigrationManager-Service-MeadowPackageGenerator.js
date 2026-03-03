/**
 * Meadow Migration Manager - Meadow Package Generator Service
 *
 * Converts DDL-level schemas (with a Tables array) into Meadow package JSON
 * format, mapping column data types and magic column names to the Meadow
 * schema conventions used by Stricture and the Meadow ORM.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Service that converts DDL-level schemas to Meadow package JSON format.
 */
class MigrationManagerServiceMeadowPackageGenerator extends libFableServiceBase
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

		this.serviceType = 'MeadowPackageGenerator';
	}

	/**
	 * Generate Meadow package objects from a full DDL-level compiled schema.
	 *
	 * Iterates over all tables in the schema and produces an array of Meadow
	 * package definitions.
	 *
	 * @param {Object} pCompiledSchema - The compiled DDL schema
	 * @param {Array}  pCompiledSchema.Tables - Array of table objects with TableName, Columns, etc.
	 *
	 * @return {Array<Object>} Array of Meadow package objects
	 */
	generateFromDDLSchema(pCompiledSchema)
	{
		let tmpPackages = [];
		let tmpTables = Array.isArray(pCompiledSchema.Tables) ? pCompiledSchema.Tables : [];

		for (let i = 0; i < tmpTables.length; i++)
		{
			tmpPackages.push(this.generateFromTable(tmpTables[i]));
		}

		return tmpPackages;
	}

	/**
	 * Generate a single Meadow package object from a table DDL schema.
	 *
	 * Maps each column's DataType to the Meadow schema type convention, applies
	 * magic column name overrides for change-tracking columns, and builds the
	 * default object with appropriate initial values.
	 *
	 * @param {Object} pTableSchema - A single table's DDL schema
	 * @param {string} pTableSchema.TableName - The name of the table
	 * @param {Array}  pTableSchema.Columns - Array of column objects with Column, DataType, Size
	 *
	 * @return {Object} A Meadow package definition with Scope, DefaultIdentifier, Schema, and DefaultObject
	 */
	generateFromTable(pTableSchema)
	{
		let tmpTableName = pTableSchema.TableName;
		let tmpColumns = Array.isArray(pTableSchema.Columns) ? pTableSchema.Columns : [];
		let tmpPrimaryKey = 'ID' + tmpTableName;

		// Find the actual primary key column
		for (let i = 0; i < tmpColumns.length; i++)
		{
			if (tmpColumns[i].DataType === 'ID')
			{
				tmpPrimaryKey = tmpColumns[i].Column;
			}
		}

		let tmpPackage = {
			Scope: tmpTableName,
			DefaultIdentifier: tmpPrimaryKey,
			Schema: [],
			DefaultObject: {}
		};

		for (let i = 0; i < tmpColumns.length; i++)
		{
			let tmpColumnName = tmpColumns[i].Column;
			let tmpColumnDataType = tmpColumns[i].DataType;
			let tmpColumnSize = tmpColumns[i].hasOwnProperty('Size') ? tmpColumns[i].Size : '';

			let tmpSchemaEntry = { Column: tmpColumnName, Type: 'Default', Size: '' };
			let tmpDefaultValue;

			// Map DataType to Meadow schema type and set default value
			switch (tmpColumnDataType)
			{
				case 'ID':
					tmpSchemaEntry.Type = 'AutoIdentity';
					tmpDefaultValue = 0;
					break;
				case 'GUID':
					tmpSchemaEntry.Type = 'AutoGUID';
					tmpDefaultValue = '0x0000000000000000';
					break;
				case 'ForeignKey':
					tmpSchemaEntry.Type = 'Integer';
					tmpDefaultValue = 0;
					break;
				case 'Numeric':
					tmpSchemaEntry.Type = 'Integer';
					tmpDefaultValue = 0;
					break;
				case 'Decimal':
					tmpSchemaEntry.Type = 'Decimal';
					tmpDefaultValue = 0.0;
					break;
				case 'String':
				case 'Text':
					tmpSchemaEntry.Type = 'String';
					tmpDefaultValue = '';
					break;
				case 'DateTime':
					tmpSchemaEntry.Type = 'DateTime';
					tmpDefaultValue = null;
					break;
				case 'Boolean':
					tmpSchemaEntry.Type = 'Boolean';
					tmpDefaultValue = false;
					break;
				default:
					tmpSchemaEntry.Type = 'String';
					tmpDefaultValue = '';
					break;
			}

			// Magic column name overrides for change-tracking columns
			switch (tmpColumnName)
			{
				case 'CreateDate':
					tmpSchemaEntry.Type = 'CreateDate';
					break;
				case 'CreatingIDUser':
					tmpSchemaEntry.Type = 'CreateIDUser';
					break;
				case 'UpdateDate':
					tmpSchemaEntry.Type = 'UpdateDate';
					break;
				case 'UpdatingIDUser':
					tmpSchemaEntry.Type = 'UpdateIDUser';
					break;
				case 'Deleted':
					tmpSchemaEntry.Type = 'Deleted';
					break;
				case 'DeleteDate':
					tmpSchemaEntry.Type = 'DeleteDate';
					break;
				case 'DeletingIDUser':
					tmpSchemaEntry.Type = 'DeleteIDUser';
					break;
			}

			tmpSchemaEntry.Size = String(tmpColumnSize);
			tmpPackage.Schema.push(tmpSchemaEntry);
			tmpPackage.DefaultObject[tmpColumnName] = tmpDefaultValue;
		}

		return tmpPackage;
	}
}

module.exports = MigrationManagerServiceMeadowPackageGenerator;

/** @type {Record<string, any>} */
MigrationManagerServiceMeadowPackageGenerator.default_configuration = {};
