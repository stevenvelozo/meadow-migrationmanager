/**
 * Meadow Migration Manager CLI Command - Migrate
 *
 * Runs a migration on a live database, applying schema changes to bring it
 * in line with the target schema. Requires an active database connection
 * and the appropriate provider package to be installed.
 *
 * Usage: meadow-migration migrate <schema> <connection>
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandMigrate extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'migrate';
		this.options.Description = 'Run a migration on a live database.';
		this.options.Aliases.push('m');

		this.options.CommandArguments.push(
			{ Name: '[schema]', Description: 'Schema name.', Default: '' });
		this.options.CommandArguments.push(
			{ Name: '[connection]', Description: 'Connection name.', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpArgs = (typeof (this.ArgumentString) === 'string') ? this.ArgumentString.trim().split(/\s+/) : [];
		let tmpSchemaName = tmpArgs[0] || '';
		let tmpConnectionName = tmpArgs[1] || '';

		if (!tmpSchemaName || !tmpConnectionName)
		{
			this.log.error('Both <schema> and <connection> arguments are required.');
			return fCallback();
		}

		this.log.info('Migrate requires a live database connection.');
		this.log.info(`  Schema:     ${tmpSchemaName}`);
		this.log.info(`  Connection: ${tmpConnectionName}`);
		this.log.info('');
		this.log.info('This feature requires the appropriate database provider package to be installed.');
		this.log.info('Migration is not yet available via the CLI.');

		return fCallback();
	}
}

module.exports = MigrationManagerCommandMigrate;
