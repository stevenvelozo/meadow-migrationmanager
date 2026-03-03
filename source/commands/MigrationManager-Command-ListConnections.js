/**
 * Meadow Migration Manager CLI Command - List Connections
 *
 * Lists all connections currently stored in the connection library.
 *
 * Usage: meadow-migration list-connections
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandListConnections extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'list-connections';
		this.options.Description = 'List all connections in the library.';
		this.options.Aliases.push('lc');

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpConnectionLibraryFile = this.fable.ProgramConfiguration.ConnectionLibraryFile || '.meadow-migration-connections.json';

		let tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');

		tmpConnectionLibrary.loadLibrary(tmpConnectionLibraryFile,
			(pError) =>
			{
				if (pError)
				{
					this.log.warn(`Could not load connection library from [${tmpConnectionLibraryFile}]: ${pError.message}`);
					this.log.info('No connections found. Use "add-connection" to add one.');
					return fCallback();
				}

				let tmpConnectionNames = tmpConnectionLibrary.listConnections();

				if (tmpConnectionNames.length === 0)
				{
					this.log.info('No connections in library.');
					return fCallback();
				}

				this.log.info(`Connections (${tmpConnectionNames.length}):`);

				for (let i = 0; i < tmpConnectionNames.length; i++)
				{
					let tmpConnection = tmpConnectionLibrary.getConnection(tmpConnectionNames[i]);
					let tmpType = tmpConnection.Type || 'Unknown';
					this.log.info(`  ${tmpConnectionNames[i]}  (${tmpType})`);
				}

				return fCallback();
			});
	}
}

module.exports = MigrationManagerCommandListConnections;
