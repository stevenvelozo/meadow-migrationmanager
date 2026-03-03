/**
 * Meadow Migration Manager - Schema Introspector Service
 *
 * Wraps introspection methods on Meadow schema providers, delegating calls
 * to the appropriate provider instance for database schema discovery.
 *
 * All methods take an already-created schema provider as the first argument,
 * allowing callers to manage provider lifecycle and connection setup externally.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libAsync = require('async');

const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Service that wraps schema provider introspection methods.
 */
class MigrationManagerServiceSchemaIntrospector extends libFableServiceBase
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

		this.serviceType = 'SchemaIntrospector';
	}

	/**
	 * Introspect the full database schema via the given provider.
	 *
	 * Delegates to `pSchemaProvider.introspectDatabaseSchema()` which returns
	 * a complete representation of every table and column in the database.
	 *
	 * @param {Object} pSchemaProvider - An initialized schema provider instance
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pSchema)
	 */
	introspectDatabase(pSchemaProvider, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`SchemaIntrospector: Introspecting full database schema...`);

		pSchemaProvider.introspectDatabaseSchema(tmpCallback);
	}

	/**
	 * Introspect a single table's schema via the given provider.
	 *
	 * Delegates to `pSchemaProvider.introspectTableSchema()` which returns
	 * the column definitions for the specified table.
	 *
	 * @param {Object} pSchemaProvider - An initialized schema provider instance
	 * @param {string} pTableName - The name of the table to introspect
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pTableSchema)
	 */
	introspectTable(pSchemaProvider, pTableName, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`SchemaIntrospector: Introspecting table [${pTableName}]...`);

		pSchemaProvider.introspectTableSchema(pTableName, tmpCallback);
	}

	/**
	 * List all tables in the database via the given provider.
	 *
	 * Delegates to `pSchemaProvider.listTables()` which returns an array
	 * of table names present in the connected database.
	 *
	 * @param {Object} pSchemaProvider - An initialized schema provider instance
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pTableList)
	 */
	listTables(pSchemaProvider, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`SchemaIntrospector: Listing tables...`);

		pSchemaProvider.listTables(tmpCallback);
	}

	/**
	 * Generate Meadow package definitions for all tables in the database.
	 *
	 * Lists all tables via the provider, then iterates each table using
	 * `async.mapSeries` to call `pSchemaProvider.generateMeadowPackageFromTable`
	 * for each one, collecting the resulting package definitions.
	 *
	 * @param {Object} pSchemaProvider - An initialized schema provider instance
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pPackages)
	 */
	generateMeadowPackages(pSchemaProvider, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`SchemaIntrospector: Generating Meadow packages from database...`);

		pSchemaProvider.listTables(
			(pError, pTableList) =>
			{
				if (pError)
				{
					this.log.error(`SchemaIntrospector: Error listing tables: ${pError}`);
					return tmpCallback(pError);
				}

				if (!Array.isArray(pTableList) || pTableList.length === 0)
				{
					this.log.warn(`SchemaIntrospector: No tables found in database.`);
					return tmpCallback(null, []);
				}

				this.log.info(`SchemaIntrospector: Found ${pTableList.length} table(s), generating packages...`);

				libAsync.mapSeries(pTableList,
					(pTableName, fNext) =>
					{
						pSchemaProvider.generateMeadowPackageFromTable(pTableName, fNext);
					},
					(pMapError, pPackages) =>
					{
						if (pMapError)
						{
							this.log.error(`SchemaIntrospector: Error generating Meadow packages: ${pMapError}`);
							return tmpCallback(pMapError);
						}

						this.log.info(`SchemaIntrospector: Generated ${pPackages.length} Meadow package(s).`);
						return tmpCallback(null, pPackages);
					});
			});
	}
}

module.exports = MigrationManagerServiceSchemaIntrospector;

/** @type {Record<string, any>} */
MigrationManagerServiceSchemaIntrospector.default_configuration = {};
