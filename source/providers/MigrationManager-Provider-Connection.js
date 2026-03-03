/**
 * Meadow Migration Manager - Connection Provider
 *
 * PictProvider responsible for loading and saving the connection library.
 * On application data load, initializes the ConnectionLibrary service and
 * loads the persisted connection library from the configured file path.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictProvider = require('pict-provider');

class MigrationManagerProviderConnection extends libPictProvider
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
	 * Load the connection library during application data load.
	 *
	 * Instantiates the ConnectionLibrary service if it does not already
	 * exist, then loads the library from the configured file path. If no
	 * file path is configured, the callback completes immediately with an
	 * empty library.
	 *
	 * @param {Function} fCallback - Callback invoked as fCallback(pError)
	 */
	onLoadDataAsync(fCallback)
	{
		let tmpConnectionLibrary = this.fable.instantiateServiceProviderIfNotExists('ConnectionLibrary');

		if (!tmpConnectionLibrary)
		{
			this.log.warn('MigrationManager-Connection-Provider: ConnectionLibrary service not available.');
			return fCallback();
		}

		let tmpFilePath = this.fable.settings.MigrationManager && this.fable.settings.MigrationManager.ConnectionLibraryPath;

		if (!tmpFilePath)
		{
			this.log.info('MigrationManager-Connection-Provider: No ConnectionLibraryPath configured; skipping load.');
			return fCallback();
		}

		tmpConnectionLibrary.loadLibrary(tmpFilePath,
			(pError) =>
			{
				if (pError)
				{
					this.log.warn(`MigrationManager-Connection-Provider: Could not load connection library from [${tmpFilePath}]: ${pError}`);
				}
				else
				{
					this.log.info(`MigrationManager-Connection-Provider: Connection library loaded from [${tmpFilePath}]`);
				}

				return fCallback();
			});
	}

	/**
	 * Save the connection library during application data save.
	 *
	 * Persists the current connection library to the configured file path.
	 *
	 * @param {Function} fCallback - Callback invoked as fCallback(pError)
	 */
	onSaveDataAsync(fCallback)
	{
		let tmpConnectionLibrary = this.fable.instantiateServiceProviderIfNotExists('ConnectionLibrary');

		if (!tmpConnectionLibrary)
		{
			this.log.warn('MigrationManager-Connection-Provider: ConnectionLibrary service not available for save.');
			return fCallback();
		}

		let tmpFilePath = this.fable.settings.MigrationManager && this.fable.settings.MigrationManager.ConnectionLibraryPath;

		if (!tmpFilePath)
		{
			this.log.info('MigrationManager-Connection-Provider: No ConnectionLibraryPath configured; skipping save.');
			return fCallback();
		}

		tmpConnectionLibrary.saveLibrary(tmpFilePath,
			(pError) =>
			{
				if (pError)
				{
					this.log.warn(`MigrationManager-Connection-Provider: Could not save connection library to [${tmpFilePath}]: ${pError}`);
				}
				else
				{
					this.log.info(`MigrationManager-Connection-Provider: Connection library saved to [${tmpFilePath}]`);
				}

				return fCallback();
			});
	}
}

MigrationManagerProviderConnection.default_configuration =
{
	ProviderIdentifier: 'MigrationManager-Connection-Provider',
	AutoInitialize: true,
	AutoLoadDataWithApp: true
};

module.exports = MigrationManagerProviderConnection;
