/**
 * Meadow Migration Manager CLI Command - Deploy
 *
 * Deploys a compiled schema to a live database. Requires an active database
 * connection and the appropriate provider package to be installed.
 *
 * Usage: meadow-migration deploy <schema> <connection>
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandDeploy extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'deploy';
		this.options.Description = 'Deploy a compiled schema to a live database.';
		this.options.Aliases.push('dep');

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

		this.log.info('Deploy requires a live database connection.');
		this.log.info(`  Schema:     ${tmpSchemaName}`);
		this.log.info(`  Connection: ${tmpConnectionName}`);
		this.log.info('');
		this.log.info('This feature requires the appropriate database provider package to be installed.');
		this.log.info('Deploy is not yet available via the CLI.');

		return fCallback();
	}
}

module.exports = MigrationManagerCommandDeploy;
