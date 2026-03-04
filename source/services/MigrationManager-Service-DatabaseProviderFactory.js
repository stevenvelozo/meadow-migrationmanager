/**
 * Meadow Migration Manager - Database Provider Factory Service
 *
 * Bridges the gap between ConnectionLibrary configs and meadow-connection-*
 * provider modules. Creates connected database providers from generic
 * connection configurations, enabling introspection, deployment and migration
 * across MySQL, PostgreSQL, MSSQL and SQLite.
 *
 * All three UIs (CLI, ConsoleUI, Web) use this service to interact with live
 * databases through a consistent interface.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceBase = require('fable').ServiceProviderBase;

class MigrationManagerServiceDatabaseProviderFactory extends libFableServiceBase
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

		this.serviceType = 'DatabaseProviderFactory';

		// Discover which connection modules are available at runtime.
		// Each module is optional — if the user doesn't need MySQL they
		// don't need mysql2 installed.
		this._ProviderModules = {};

		try { this._ProviderModules.MySQL = require('meadow-connection-mysql'); }
		catch (pError) { /* module not installed */ }

		try { this._ProviderModules.PostgreSQL = require('meadow-connection-postgresql'); }
		catch (pError) { /* module not installed */ }

		try { this._ProviderModules.MSSQL = require('meadow-connection-mssql'); }
		catch (pError) { /* module not installed */ }

		try { this._ProviderModules.SQLite = require('meadow-connection-sqlite'); }
		catch (pError) { /* module not installed */ }
	}

	/**
	 * List the database provider types that are available (installed).
	 *
	 * @return {Array<string>} Array of provider type names (e.g. ['MySQL', 'PostgreSQL'])
	 */
	listAvailableProviders()
	{
		return Object.keys(this._ProviderModules);
	}

	/**
	 * Check whether a specific provider type is available.
	 *
	 * @param {string} pType - The provider type name
	 * @return {boolean}
	 */
	isProviderAvailable(pType)
	{
		return this._ProviderModules.hasOwnProperty(pType);
	}

	/**
	 * Map a generic ConnectionLibrary config to provider-specific options.
	 *
	 * ConnectionLibrary stores: { server, port, user, password, database }
	 * Each provider expects a different nested format.
	 *
	 * @param {string} pType - The provider type (MySQL, PostgreSQL, MSSQL, SQLite)
	 * @param {Object} pConfig - The generic connection config
	 *
	 * @return {Object} Provider-specific options hash
	 */
	_mapConfigToProviderOptions(pType, pConfig)
	{
		let tmpConfig = pConfig || {};

		switch (pType)
		{
			case 'MySQL':
				return {
					MySQL:
					{
						host: tmpConfig.server || tmpConfig.host || '127.0.0.1',
						port: tmpConfig.port || 3306,
						user: tmpConfig.user || 'root',
						password: tmpConfig.password || '',
						database: tmpConfig.database || '',
						connectionLimit: tmpConfig.connectionLimit || 5
					}
				};

			case 'PostgreSQL':
				return {
					PostgreSQL:
					{
						host: tmpConfig.server || tmpConfig.host || '127.0.0.1',
						port: tmpConfig.port || 5432,
						user: tmpConfig.user || 'postgres',
						password: tmpConfig.password || '',
						database: tmpConfig.database || ''
					}
				};

			case 'MSSQL':
				return {
					MSSQL:
					{
						server: tmpConfig.server || tmpConfig.host || '127.0.0.1',
						port: tmpConfig.port || 1433,
						user: tmpConfig.user || 'sa',
						password: tmpConfig.password || '',
						database: tmpConfig.database || ''
					}
				};

			case 'SQLite':
				return {
					SQLiteFilePath: tmpConfig.database || tmpConfig.SQLiteFilePath || ':memory:'
				};

			default:
				return {};
		}
	}

	/**
	 * Create a connected database provider from a type and config.
	 *
	 * This is the core method — it instantiates the appropriate
	 * meadow-connection-* module, maps the config, connects, and returns
	 * the ready-to-use provider.
	 *
	 * @param {string} pType - The provider type (MySQL, PostgreSQL, MSSQL, SQLite)
	 * @param {Object} pConfig - The generic connection config { server, port, user, password, database }
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pProvider)
	 */
	createProvider(pType, pConfig, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		if (!this.isProviderAvailable(pType))
		{
			let tmpAvailable = this.listAvailableProviders().join(', ') || '(none)';
			return tmpCallback(new Error(`Provider type [${pType}] is not available. Installed providers: ${tmpAvailable}`));
		}

		let tmpProviderModule = this._ProviderModules[pType];
		let tmpMappedConfig = this._mapConfigToProviderOptions(pType, pConfig);
		let tmpHash = `DatabaseProvider-${pType}-${Date.now()}`;

		this.log.info(`DatabaseProviderFactory: Creating [${pType}] provider...`);

		try
		{
			let tmpProvider = new tmpProviderModule(this.fable, tmpMappedConfig, tmpHash);

			tmpProvider.connectAsync(
				(pError) =>
				{
					if (pError)
					{
						this.log.error(`DatabaseProviderFactory: Connection failed for [${pType}]: ${pError.message || pError}`);
						return tmpCallback(pError);
					}

					this.log.info(`DatabaseProviderFactory: Connected to [${pType}] database.`);
					return tmpCallback(null, tmpProvider);
				});
		}
		catch (pError)
		{
			this.log.error(`DatabaseProviderFactory: Error creating [${pType}] provider: ${pError.message || pError}`);
			return tmpCallback(pError);
		}
	}

	/**
	 * Create a connected provider from a named ConnectionLibrary entry.
	 *
	 * Looks up the connection in ConnectionLibrary, then delegates to
	 * createProvider().
	 *
	 * @param {string} pConnectionName - The name of the connection in the library
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pProvider, pConnectionEntry)
	 */
	createProviderFromConnection(pConnectionName, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpConnectionLibrary = this.fable.services.ConnectionLibrary;

		if (!tmpConnectionLibrary)
		{
			// Try to instantiate it if not yet created
			try
			{
				tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');
			}
			catch (pError)
			{
				return tmpCallback(new Error('ConnectionLibrary service is not available.'));
			}
		}

		let tmpEntry = tmpConnectionLibrary.getConnection(pConnectionName);

		if (!tmpEntry)
		{
			return tmpCallback(new Error(`Connection [${pConnectionName}] not found in library.`));
		}

		this.createProvider(tmpEntry.Type, tmpEntry.Config,
			(pError, pProvider) =>
			{
				if (pError)
				{
					return tmpCallback(pError);
				}

				return tmpCallback(null, pProvider, tmpEntry);
			});
	}

	/**
	 * Test a named connection by connecting and listing tables.
	 *
	 * @param {string} pConnectionName - The name of the connection to test
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pTableList)
	 */
	testConnection(pConnectionName, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.createProviderFromConnection(pConnectionName,
			(pError, pProvider) =>
			{
				if (pError)
				{
					return tmpCallback(pError);
				}

				this.log.info(`DatabaseProviderFactory: Testing connection [${pConnectionName}]...`);

				pProvider.listTables(
					(pListError, pTableList) =>
					{
						if (pListError)
						{
							this.log.error(`DatabaseProviderFactory: Test failed for [${pConnectionName}]: ${pListError.message || pListError}`);
							return tmpCallback(pListError);
						}

						this.log.info(`DatabaseProviderFactory: Connection [${pConnectionName}] OK — found ${pTableList.length} table(s).`);
						return tmpCallback(null, pTableList);
					});
			});
	}

	/**
	 * Test a connection by type and config (without requiring a saved entry).
	 *
	 * @param {string} pType - The provider type
	 * @param {Object} pConfig - The connection config
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pTableList)
	 */
	testConnectionConfig(pType, pConfig, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.createProvider(pType, pConfig,
			(pError, pProvider) =>
			{
				if (pError)
				{
					return tmpCallback(pError);
				}

				pProvider.listTables(
					(pListError, pTableList) =>
					{
						if (pListError)
						{
							return tmpCallback(pListError);
						}

						return tmpCallback(null, pTableList);
					});
			});
	}

	/**
	 * Fully introspect a named connection's database.
	 *
	 * Creates a provider, connects, introspects all tables, and returns
	 * the schema in the format SchemaDiff expects:
	 *   { Tables: [{ TableName, Columns, Indices?, ForeignKeys? }] }
	 *
	 * Also stores the result in fable.AppData.MigrationManager.IntrospectionResult.
	 *
	 * @param {string} pConnectionName - The name of the connection to introspect
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pSchema)
	 */
	introspectConnection(pConnectionName, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.createProviderFromConnection(pConnectionName,
			(pError, pProvider, pConnectionEntry) =>
			{
				if (pError)
				{
					return tmpCallback(pError);
				}

				this.log.info(`DatabaseProviderFactory: Introspecting database for connection [${pConnectionName}]...`);

				pProvider.introspectDatabaseSchema(
					(pIntrospectError, pSchema) =>
					{
						if (pIntrospectError)
						{
							this.log.error(`DatabaseProviderFactory: Introspection failed for [${pConnectionName}]: ${pIntrospectError.message || pIntrospectError}`);
							return tmpCallback(pIntrospectError);
						}

						this.log.info(`DatabaseProviderFactory: Introspection complete for [${pConnectionName}] — ${(pSchema && pSchema.Tables) ? pSchema.Tables.length : 0} table(s).`);

						// Store in AppData for other services to reference
						this.fable.AppData.MigrationManager.IntrospectionResult = pSchema;

						return tmpCallback(null, pSchema);
					});
			});
	}

	/**
	 * Introspect a database by type and config (without requiring a saved entry).
	 *
	 * @param {string} pType - The provider type
	 * @param {Object} pConfig - The connection config
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pSchema)
	 */
	introspectConnectionConfig(pType, pConfig, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.createProvider(pType, pConfig,
			(pError, pProvider) =>
			{
				if (pError)
				{
					return tmpCallback(pError);
				}

				pProvider.introspectDatabaseSchema(
					(pIntrospectError, pSchema) =>
					{
						if (pIntrospectError)
						{
							return tmpCallback(pIntrospectError);
						}

						this.fable.AppData.MigrationManager.IntrospectionResult = pSchema;
						return tmpCallback(null, pSchema);
					});
			});
	}
}

module.exports = MigrationManagerServiceDatabaseProviderFactory;

/** @type {Record<string, any>} */
MigrationManagerServiceDatabaseProviderFactory.default_configuration = {};
