/**
 * Meadow Migration Manager CLI Command - TUI
 *
 * Launches the interactive Terminal User Interface for managing schemas,
 * connections, and migrations.
 *
 * Usage: meadow-migration tui
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandTUI extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'tui';
		this.options.Description = 'Launch the Terminal User Interface.';
		this.options.Aliases.push('ui');

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpMigrationManager = require('../MeadowMigrationManager.js');
		let tmpMM = new tmpMigrationManager(this.fable.settings);

		// Copy over services that are already registered
		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');
		let tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');

		// Transfer AppData if available
		if (this.fable.AppData && this.fable.AppData.MigrationManager)
		{
			tmpMM.AppData.MigrationManager = this.fable.AppData.MigrationManager;
		}

		// Load connections from cascading configuration into the TUI instance
		tmpConnectionLibrary.loadFromConfiguration();

		let tmpTUIApp = require('../tui/MigrationManager-TUI-App.js');
		let tmpApp = tmpMM.addApplication(tmpTUIApp.name || 'MigrationManagerTUIApplication', {}, tmpTUIApp);

		tmpMM.initializeAsync(
			(pError) =>
			{
				if (pError)
				{
					this.log.error(`Error initializing TUI: ${pError.message || pError}`);
					return fCallback();
				}

				// The TUI will now be running; the callback will be called when it exits
				// Since blessed screen takes over, we don't call fCallback until quit
			});
	}
}

module.exports = MigrationManagerCommandTUI;
