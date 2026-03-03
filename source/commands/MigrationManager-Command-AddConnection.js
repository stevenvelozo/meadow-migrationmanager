/**
 * Meadow Migration Manager CLI Command - Add Connection
 *
 * Adds a database connection configuration to the connection library.
 *
 * Usage: meadow-migration add-connection <name> [-t type] [-s host] [-p port] [-u user] [-w password] [-d database]
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandAddConnection extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'add-connection';
		this.options.Description = 'Add a database connection to the library.';
		this.options.Aliases.push('ac');

		this.options.CommandArguments.push(
			{ Name: '[name]', Description: 'Connection name.', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-t, --type <type>', Description: 'Database type (MySQL, PostgreSQL, MSSQL, SQLite).', Default: 'SQLite' });
		this.options.CommandOptions.push(
			{ Name: '-s, --server <host>', Description: 'Server hostname.', Default: '127.0.0.1' });
		this.options.CommandOptions.push(
			{ Name: '-p, --port <port>', Description: 'Server port.', Default: '' });
		this.options.CommandOptions.push(
			{ Name: '-u, --user <user>', Description: 'Database user.', Default: '' });
		this.options.CommandOptions.push(
			{ Name: '-w, --password <password>', Description: 'Database password.', Default: '' });
		this.options.CommandOptions.push(
			{ Name: '-d, --database <database>', Description: 'Database name.', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpConnectionLibraryFile = this.fable.ProgramConfiguration.ConnectionLibraryFile || '.meadow-migration-connections.json';

		let tmpName = this.ArgumentString || '';

		if (!tmpName)
		{
			this.log.error('The <name> argument is required.');
			return fCallback();
		}

		let tmpType = (this.CommandOptions && this.CommandOptions.type) || 'SQLite';
		let tmpServer = (this.CommandOptions && this.CommandOptions.server) || '127.0.0.1';
		let tmpPort = (this.CommandOptions && this.CommandOptions.port) || '';
		let tmpUser = (this.CommandOptions && this.CommandOptions.user) || '';
		let tmpPassword = (this.CommandOptions && this.CommandOptions.password) || '';
		let tmpDatabase = (this.CommandOptions && this.CommandOptions.database) || '';

		let tmpConfig =
		{
			server: tmpServer,
			port: tmpPort,
			user: tmpUser,
			password: tmpPassword,
			database: tmpDatabase
		};

		let tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');

		// Try to load existing library first (ignore error if file does not exist)
		tmpConnectionLibrary.loadLibrary(tmpConnectionLibraryFile,
			() =>
			{
				tmpConnectionLibrary.addConnection(tmpName, tmpType, tmpConfig);

				tmpConnectionLibrary.saveLibrary(tmpConnectionLibraryFile,
					(pSaveError) =>
					{
						if (pSaveError)
						{
							this.log.error(`Error saving connection library: ${pSaveError.message}`);
							return fCallback();
						}

						this.log.info(`Connection [${tmpName}] (${tmpType}) added and saved to [${tmpConnectionLibraryFile}].`);
						return fCallback();
					});
			});
	}
}

module.exports = MigrationManagerCommandAddConnection;
