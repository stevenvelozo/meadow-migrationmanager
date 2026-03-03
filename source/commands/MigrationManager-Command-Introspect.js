/**
 * Meadow Migration Manager CLI Command - Introspect
 *
 * Introspects a live database to discover its schema. Requires an active
 * database connection and the appropriate provider package to be installed.
 *
 * Usage: meadow-migration introspect <connection> [-o name]
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandIntrospect extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'introspect';
		this.options.Description = 'Introspect a live database to discover its schema.';
		this.options.Aliases.push('i');

		this.options.CommandArguments.push(
			{ Name: '[connection]', Description: 'Connection name.', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-o, --output <name>', Description: 'Save introspected schema to library with this name.', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpConnectionLibraryFile = this.fable.ProgramConfiguration.ConnectionLibraryFile || '.meadow-migration-connections.json';

		let tmpConnectionName = this.ArgumentString || '';

		if (!tmpConnectionName)
		{
			this.log.error('The <connection> argument is required.');
			return fCallback();
		}

		let tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');

		tmpConnectionLibrary.loadLibrary(tmpConnectionLibraryFile,
			(pLoadError) =>
			{
				if (pLoadError)
				{
					this.log.error(`Error loading connection library from [${tmpConnectionLibraryFile}]: ${pLoadError.message}`);
					return fCallback();
				}

				let tmpConnection = tmpConnectionLibrary.getConnection(tmpConnectionName);

				if (!tmpConnection)
				{
					this.log.error(`Connection [${tmpConnectionName}] not found in library.`);
					return fCallback();
				}

				this.log.info(`Introspection requires a live database connection.`);
				this.log.info(`Connection: [${tmpConnectionName}]`);
				this.log.info(`  Type:     ${tmpConnection.Type}`);
				this.log.info(`  Server:   ${tmpConnection.Config.server}`);
				this.log.info(`  Port:     ${tmpConnection.Config.port || '(default)'}`);
				this.log.info(`  Database: ${tmpConnection.Config.database || '(not set)'}`);
				this.log.info('');
				this.log.info('This feature requires the appropriate database provider package to be installed.');
				this.log.info('Introspection is not yet available via the CLI.');

				return fCallback();
			});
	}
}

module.exports = MigrationManagerCommandIntrospect;
