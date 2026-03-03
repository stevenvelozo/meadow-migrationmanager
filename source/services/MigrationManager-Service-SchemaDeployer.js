/**
 * Meadow Migration Manager - Schema Deployer Service
 *
 * Creates tables and indices on a live database from a compiled DDL schema.
 * Delegates all database operations to the provided schema provider instance,
 * allowing callers to manage provider lifecycle and connection setup externally.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Service that deploys compiled DDL schemas to a live database.
 */
class MigrationManagerServiceSchemaDeployer extends libFableServiceBase
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

		this.serviceType = 'SchemaDeployer';
	}

	/**
	 * Deploy a full compiled schema to the database.
	 *
	 * Creates all tables defined in the compiled schema, then creates all
	 * indices. Tables are created first to ensure foreign key references
	 * resolve correctly before index creation.
	 *
	 * @param {Object} pSchemaProvider - An initialized schema provider instance
	 * @param {Object} pCompiledSchema - The compiled DDL schema with Tables array
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	deploySchema(pSchemaProvider, pCompiledSchema, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`SchemaDeployer: Deploying full schema...`);

		pSchemaProvider.createTables(pCompiledSchema,
			(pError) =>
			{
				if (pError)
				{
					this.log.error(`SchemaDeployer: Error creating tables: ${pError}`);
					return tmpCallback(pError);
				}

				this.log.info(`SchemaDeployer: Tables created successfully, creating indices...`);

				pSchemaProvider.createAllIndices(pCompiledSchema,
					(pIndexError) =>
					{
						if (pIndexError)
						{
							this.log.error(`SchemaDeployer: Error creating indices: ${pIndexError}`);
							return tmpCallback(pIndexError);
						}

						this.log.info(`SchemaDeployer: Schema deployed successfully.`);
						return tmpCallback(null);
					});
			});
	}

	/**
	 * Deploy a single table and its indices to the database.
	 *
	 * Creates the specified table, then creates its indices. This is useful
	 * for incremental deployments or adding individual tables to an existing
	 * database.
	 *
	 * @param {Object} pSchemaProvider - An initialized schema provider instance
	 * @param {Object} pTableSchema - A single table schema object
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	deployTable(pSchemaProvider, pTableSchema, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpTableName = pTableSchema.TableName || 'Unknown';

		this.log.info(`SchemaDeployer: Deploying table [${tmpTableName}]...`);

		pSchemaProvider.createTable(pTableSchema,
			(pError) =>
			{
				if (pError)
				{
					this.log.error(`SchemaDeployer: Error creating table [${tmpTableName}]: ${pError}`);
					return tmpCallback(pError);
				}

				this.log.info(`SchemaDeployer: Table [${tmpTableName}] created, creating indices...`);

				pSchemaProvider.createIndices(pTableSchema,
					(pIndexError) =>
					{
						if (pIndexError)
						{
							this.log.error(`SchemaDeployer: Error creating indices for table [${tmpTableName}]: ${pIndexError}`);
							return tmpCallback(pIndexError);
						}

						this.log.info(`SchemaDeployer: Table [${tmpTableName}] deployed successfully.`);
						return tmpCallback(null);
					});
			});
	}
}

module.exports = MigrationManagerServiceSchemaDeployer;

/** @type {Record<string, any>} */
MigrationManagerServiceSchemaDeployer.default_configuration = {};
