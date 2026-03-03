/**
 * Meadow Migration Manager - Schema Provider
 *
 * PictProvider responsible for loading and saving the schema library. On
 * application data load, initializes the SchemaLibrary service and loads
 * the persisted schema library from the configured file path.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictProvider = require('pict-provider');

class MigrationManagerProviderSchema extends libPictProvider
{
	/**
	 * @param {Object} pFable - The Fable/Pict instance
	 * @param {Object} pOptions - Provider configuration options
	 * @param {String} pServiceHash - The service hash
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'PictProvider';
	}

	/**
	 * Load the schema library during application data load.
	 *
	 * Instantiates the SchemaLibrary service if it does not already exist,
	 * then loads the library from the configured file path. If no file path
	 * is configured, the callback completes immediately with an empty library.
	 *
	 * @param {Function} fCallback - Callback invoked as fCallback(pError)
	 */
	onLoadDataAsync(fCallback)
	{
		let tmpSchemaLibrary = this.fable.instantiateServiceProviderIfNotExists('SchemaLibrary');

		if (!tmpSchemaLibrary)
		{
			this.log.warn('MigrationManager-Schema-Provider: SchemaLibrary service not available.');
			return fCallback();
		}

		let tmpFilePath = this.fable.settings.MigrationManager && this.fable.settings.MigrationManager.SchemaLibraryPath;

		if (!tmpFilePath)
		{
			this.log.info('MigrationManager-Schema-Provider: No SchemaLibraryPath configured; skipping load.');
			return fCallback();
		}

		tmpSchemaLibrary.loadLibrary(tmpFilePath,
			(pError) =>
			{
				if (pError)
				{
					this.log.warn(`MigrationManager-Schema-Provider: Could not load schema library from [${tmpFilePath}]: ${pError}`);
				}
				else
				{
					this.log.info(`MigrationManager-Schema-Provider: Schema library loaded from [${tmpFilePath}]`);
				}

				return fCallback();
			});
	}

	/**
	 * Save the schema library during application data save.
	 *
	 * Persists the current schema library to the configured file path.
	 *
	 * @param {Function} fCallback - Callback invoked as fCallback(pError)
	 */
	onSaveDataAsync(fCallback)
	{
		let tmpSchemaLibrary = this.fable.instantiateServiceProviderIfNotExists('SchemaLibrary');

		if (!tmpSchemaLibrary)
		{
			this.log.warn('MigrationManager-Schema-Provider: SchemaLibrary service not available for save.');
			return fCallback();
		}

		let tmpFilePath = this.fable.settings.MigrationManager && this.fable.settings.MigrationManager.SchemaLibraryPath;

		if (!tmpFilePath)
		{
			this.log.info('MigrationManager-Schema-Provider: No SchemaLibraryPath configured; skipping save.');
			return fCallback();
		}

		tmpSchemaLibrary.saveLibrary(tmpFilePath,
			(pError) =>
			{
				if (pError)
				{
					this.log.warn(`MigrationManager-Schema-Provider: Could not save schema library to [${tmpFilePath}]: ${pError}`);
				}
				else
				{
					this.log.info(`MigrationManager-Schema-Provider: Schema library saved to [${tmpFilePath}]`);
				}

				return fCallback();
			});
	}
}

MigrationManagerProviderSchema.default_configuration =
{
	ProviderIdentifier: 'MigrationManager-Schema-Provider',
	AutoInitialize: true,
	AutoLoadDataWithApp: true
};

module.exports = MigrationManagerProviderSchema;
