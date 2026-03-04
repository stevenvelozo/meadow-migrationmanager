/**
 * Meadow Migration Manager - Connection Library Service
 *
 * Manages a collection of storage connection configurations. Provides CRUD
 * operations on the connection library stored at
 * `this.fable.AppData.MigrationManager.Connections`, plus file-based
 * persistence via JSON files.
 *
 * Each connection entry has the structure:
 *   {
 *       Name: 'local-mysql',
 *       Type: 'MySQL',          // MySQL | PostgreSQL | MSSQL | SQLite
 *       Config: {
 *           server: '127.0.0.1',
 *           port: 3306,
 *           user: 'root',
 *           password: '...',
 *           database: 'bookstore'
 *       }
 *   }
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libJsonFile = require('jsonfile');

const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Service that manages a library of storage connection configurations.
 */
class MigrationManagerServiceConnectionLibrary extends libFableServiceBase
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

		this.serviceType = 'ConnectionLibrary';
	}

	/**
	 * Add a connection configuration to the library.
	 *
	 * Creates a new connection entry with the given name, type, and
	 * configuration hash. If an entry with the same name already exists, it
	 * will be overwritten.
	 *
	 * @param {string} pName - The unique name for the connection
	 * @param {string} pType - The database type (MySQL, PostgreSQL, MSSQL, SQLite)
	 * @param {Object} pConfig - The connection configuration hash
	 *
	 * @return {Object} The newly created connection entry
	 */
	addConnection(pName, pType, pConfig)
	{
		let tmpConnections = this.fable.AppData.MigrationManager.Connections;

		let tmpEntry =
		{
			Name: pName,
			Type: pType,
			Config: pConfig
		};

		tmpConnections[pName] = tmpEntry;

		this.log.info(`ConnectionLibrary: Added connection [${pName}] of type [${pType}]`);
		return tmpEntry;
	}

	/**
	 * Remove a connection from the library by name.
	 *
	 * @param {string} pName - The name of the connection to remove
	 *
	 * @return {boolean} True if the connection was found and removed, false otherwise
	 */
	removeConnection(pName)
	{
		let tmpConnections = this.fable.AppData.MigrationManager.Connections;

		if (!tmpConnections.hasOwnProperty(pName))
		{
			this.log.warn(`ConnectionLibrary: Connection [${pName}] not found for removal.`);
			return false;
		}

		delete tmpConnections[pName];
		this.log.info(`ConnectionLibrary: Removed connection [${pName}]`);
		return true;
	}

	/**
	 * Retrieve a connection entry by name.
	 *
	 * @param {string} pName - The name of the connection to retrieve
	 *
	 * @return {Object|null} The connection entry, or null if not found
	 */
	getConnection(pName)
	{
		let tmpConnections = this.fable.AppData.MigrationManager.Connections;

		if (!tmpConnections.hasOwnProperty(pName))
		{
			return null;
		}

		return tmpConnections[pName];
	}

	/**
	 * List all connection names in the library.
	 *
	 * @return {Array<string>} An array of connection names
	 */
	listConnections()
	{
		return Object.keys(this.fable.AppData.MigrationManager.Connections);
	}

	/**
	 * Persist the entire connection library to a JSON file on disk.
	 *
	 * @param {string} pFilePath - Path to the output JSON file
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	saveLibrary(pFilePath, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpConnections = this.fable.AppData.MigrationManager.Connections;

		this.log.info(`ConnectionLibrary: Saving library to [${pFilePath}]`);

		libJsonFile.writeFile(pFilePath, tmpConnections, { spaces: 4 },
			(pError) =>
			{
				if (pError)
				{
					this.log.error(`ConnectionLibrary: Error saving library to [${pFilePath}]: ${pError}`);
					return tmpCallback(pError);
				}

				this.log.info(`ConnectionLibrary: Library saved successfully to [${pFilePath}]`);
				return tmpCallback(null);
			});
	}

	/**
	 * Load the connection library from a JSON file on disk.
	 *
	 * Replaces the current Connections hash with the contents of the file,
	 * then merges in any connections defined in ProgramConfiguration.Connections
	 * from the cascading config (.meadow-migration-config.json).
	 *
	 * @param {string} pFilePath - Path to the input JSON file
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	loadLibrary(pFilePath, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`ConnectionLibrary: Loading library from [${pFilePath}]`);

		libJsonFile.readFile(pFilePath,
			(pError, pData) =>
			{
				if (pError)
				{
					// File not found or unreadable is not fatal — config connections
					// may still be available
					this.log.warn(`ConnectionLibrary: Could not load library from [${pFilePath}]: ${pError.message || pError}`);
				}
				else
				{
					this.fable.AppData.MigrationManager.Connections = pData;
					this.log.info(`ConnectionLibrary: Library loaded successfully from [${pFilePath}]`);
				}

				// Merge in any connections from cascading configuration
				this.loadFromConfiguration();

				return tmpCallback(null);
			});
	}

	/**
	 * Merge connections from the cascading ProgramConfiguration into the library.
	 *
	 * Reads ProgramConfiguration.Connections (a hash of connection entries)
	 * and adds each one to the in-memory library. File-loaded connections
	 * take precedence — config connections only fill in entries that don't
	 * already exist.
	 *
	 * Configuration format (.meadow-migration-config.json):
	 *   {
	 *       "Connections": {
	 *           "my-db": {
	 *               "Type": "MySQL",
	 *               "Config": {
	 *                   "server": "localhost",
	 *                   "port": 3306,
	 *                   "user": "root",
	 *                   "password": "...",
	 *                   "database": "mydb"
	 *               }
	 *           }
	 *       }
	 *   }
	 */
	loadFromConfiguration()
	{
		let tmpProgramConfig = this.fable.ProgramConfiguration || this.fable.settings.ProgramConfiguration;

		if (!tmpProgramConfig || typeof tmpProgramConfig.Connections !== 'object')
		{
			return;
		}

		let tmpConfigConnections = tmpProgramConfig.Connections;
		let tmpConnections = this.fable.AppData.MigrationManager.Connections;
		let tmpNames = Object.keys(tmpConfigConnections);

		for (let i = 0; i < tmpNames.length; i++)
		{
			let tmpName = tmpNames[i];

			// Don't overwrite connections loaded from the library file
			if (tmpConnections.hasOwnProperty(tmpName))
			{
				continue;
			}

			let tmpEntry = tmpConfigConnections[tmpName];

			if (!tmpEntry || !tmpEntry.Type || !tmpEntry.Config)
			{
				this.log.warn(`ConnectionLibrary: Skipping invalid config connection [${tmpName}] — requires Type and Config.`);
				continue;
			}

			tmpConnections[tmpName] =
			{
				Name: tmpName,
				Type: tmpEntry.Type,
				Config: tmpEntry.Config
			};

			this.log.info(`ConnectionLibrary: Loaded connection [${tmpName}] from configuration.`);
		}
	}
}

module.exports = MigrationManagerServiceConnectionLibrary;

/** @type {Record<string, any>} */
MigrationManagerServiceConnectionLibrary.default_configuration = {};
