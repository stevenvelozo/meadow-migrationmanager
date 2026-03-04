/**
 * Meadow Migration Manager - Schema Library Service
 *
 * Manages a collection of DDL/JSON schema definitions. Provides CRUD
 * operations on the schema library stored at
 * `this.fable.AppData.MigrationManager.Schemas`, plus file-based
 * import/export and full library persistence via JSON files.
 *
 * Each schema entry has the structure:
 *   {
 *       Name: 'bookstore',
 *       DDL: '...MicroDDL text...',
 *       SourceFilePath: null,        // Absolute path when imported from file
 *       CompiledSchema: null,        // { Tables: {...} }
 *       MeadowPackages: null,        // Array of Meadow package JSONs
 *       LastCompiled: null           // ISO timestamp
 *   }
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFS = require('fs');
const libPath = require('path');
const libJsonFile = require('jsonfile');

const libFableServiceBase = require('fable').ServiceProviderBase;

/**
 * Service that manages a library of DDL schema entries.
 */
class MigrationManagerServiceSchemaLibrary extends libFableServiceBase
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

		this.serviceType = 'SchemaLibrary';
	}

	/**
	 * Add a DDL schema to the library.
	 *
	 * Creates a new schema entry with the given name and DDL text, storing it
	 * in the Schemas hash on AppData. If an entry with the same name already
	 * exists, it will be overwritten.
	 *
	 * @param {string} pName - The unique name for the schema
	 * @param {string} pDDLText - The MicroDDL text content
	 *
	 * @return {Object} The newly created schema entry
	 */
	addSchema(pName, pDDLText)
	{
		let tmpSchemas = this.fable.AppData.MigrationManager.Schemas;

		let tmpEntry =
		{
			Name: pName,
			DDL: pDDLText,
			SourceFilePath: null,
			CompiledSchema: null,
			MeadowPackages: null,
			LastCompiled: null
		};

		tmpSchemas[pName] = tmpEntry;

		this.log.info(`SchemaLibrary: Added schema [${pName}]`);
		return tmpEntry;
	}

	/**
	 * Remove a schema from the library by name.
	 *
	 * @param {string} pName - The name of the schema to remove
	 *
	 * @return {boolean} True if the schema was found and removed, false otherwise
	 */
	removeSchema(pName)
	{
		let tmpSchemas = this.fable.AppData.MigrationManager.Schemas;

		if (!tmpSchemas.hasOwnProperty(pName))
		{
			this.log.warn(`SchemaLibrary: Schema [${pName}] not found for removal.`);
			return false;
		}

		delete tmpSchemas[pName];
		this.log.info(`SchemaLibrary: Removed schema [${pName}]`);
		return true;
	}

	/**
	 * Retrieve a schema entry by name.
	 *
	 * @param {string} pName - The name of the schema to retrieve
	 *
	 * @return {Object|null} The schema entry, or null if not found
	 */
	getSchema(pName)
	{
		let tmpSchemas = this.fable.AppData.MigrationManager.Schemas;

		if (!tmpSchemas.hasOwnProperty(pName))
		{
			return null;
		}

		return tmpSchemas[pName];
	}

	/**
	 * List all schema names in the library.
	 *
	 * @return {Array<string>} An array of schema names
	 */
	listSchemas()
	{
		return Object.keys(this.fable.AppData.MigrationManager.Schemas);
	}

	/**
	 * Import a DDL schema from a file on disk.
	 *
	 * Reads the file synchronously, uses the file's basename (without
	 * extension) as the schema name, and adds it to the library.
	 *
	 * @param {string} pFilePath - Path to the DDL file to import
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pEntry)
	 */
	importSchemaFromFile(pFilePath, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		try
		{
			let tmpDDLText = libFS.readFileSync(pFilePath, 'utf8');
			let tmpName = libPath.basename(pFilePath, libPath.extname(pFilePath));
			let tmpEntry = this.addSchema(tmpName, tmpDDLText);
			tmpEntry.SourceFilePath = libPath.resolve(pFilePath);
			this.log.info(`SchemaLibrary: Imported schema from file [${pFilePath}] as [${tmpName}]`);
			return tmpCallback(null, tmpEntry);
		}
		catch (tmpError)
		{
			this.log.error(`SchemaLibrary: Error importing schema from file [${pFilePath}]: ${tmpError}`);
			return tmpCallback(tmpError);
		}
	}

	/**
	 * Export a schema's DDL text to a file on disk.
	 *
	 * Writes the DDL text synchronously. If the schema is not found, an error
	 * is passed to the callback.
	 *
	 * @param {string} pName - The name of the schema to export
	 * @param {string} pFilePath - Path to the output file
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	exportSchemaToFile(pName, pFilePath, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpEntry = this.getSchema(pName);

		if (!tmpEntry)
		{
			let tmpError = new Error(`SchemaLibrary: Schema [${pName}] not found for export.`);
			this.log.error(tmpError.message);
			return tmpCallback(tmpError);
		}

		try
		{
			libFS.writeFileSync(pFilePath, tmpEntry.DDL, 'utf8');
			this.log.info(`SchemaLibrary: Exported schema [${pName}] to file [${pFilePath}]`);
			return tmpCallback(null);
		}
		catch (tmpError)
		{
			this.log.error(`SchemaLibrary: Error exporting schema [${pName}] to file [${pFilePath}]: ${tmpError}`);
			return tmpCallback(tmpError);
		}
	}

	/**
	 * Persist the entire schema library to a JSON file on disk.
	 *
	 * @param {string} pFilePath - Path to the output JSON file
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	saveLibrary(pFilePath, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpSchemas = this.fable.AppData.MigrationManager.Schemas;

		this.log.info(`SchemaLibrary: Saving library to [${pFilePath}]`);

		libJsonFile.writeFile(pFilePath, tmpSchemas, { spaces: 4 },
			(pError) =>
			{
				if (pError)
				{
					this.log.error(`SchemaLibrary: Error saving library to [${pFilePath}]: ${pError}`);
					return tmpCallback(pError);
				}

				this.log.info(`SchemaLibrary: Library saved successfully to [${pFilePath}]`);
				return tmpCallback(null);
			});
	}

	/**
	 * Load the schema library from a JSON file on disk.
	 *
	 * Replaces the current Schemas hash with the contents of the file.
	 *
	 * @param {string} pFilePath - Path to the input JSON file
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	loadLibrary(pFilePath, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`SchemaLibrary: Loading library from [${pFilePath}]`);

		libJsonFile.readFile(pFilePath,
			(pError, pData) =>
			{
				if (pError)
				{
					this.log.error(`SchemaLibrary: Error loading library from [${pFilePath}]: ${pError}`);
					return tmpCallback(pError);
				}

				this.fable.AppData.MigrationManager.Schemas = pData;
				this.log.info(`SchemaLibrary: Library loaded successfully from [${pFilePath}]`);
				return tmpCallback(null);
			});
	}
}

module.exports = MigrationManagerServiceSchemaLibrary;

/** @type {Record<string, any>} */
MigrationManagerServiceSchemaLibrary.default_configuration = {};
