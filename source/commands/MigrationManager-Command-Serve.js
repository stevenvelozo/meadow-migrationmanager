/**
 * Meadow Migration Manager CLI Command - Serve
 *
 * Starts an HTTP server that auto-imports DDL files from a model directory,
 * compiles them, and serves a web UI for browsing schemas, viewing
 * visualizations, and managing migrations.
 *
 * Usage: meadow-migration serve [model-path] [-p port]
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFs = require('fs');
const libPath = require('path');
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandServe extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'serve';
		this.options.Description = 'Start the Migration Manager web server for a model directory.';
		this.options.Aliases.push('s');

		this.options.CommandArguments.push(
			{ Name: '[model-path]', Description: 'Path to a directory containing .mddl DDL files (defaults to current directory).', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-p, --port [port]', Description: 'Port to serve on (defaults to random 7000-7999).', Default: '0' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		// Resolve model path: CLI argument > config ModelPath > current directory
		let tmpConfigModelPath = (this.fable.ProgramConfiguration && this.fable.ProgramConfiguration.ModelPath) || '';
		let tmpModelPath = libPath.resolve(this.ArgumentString || tmpConfigModelPath || process.cwd());

		// Validate the model directory exists
		if (!libFs.existsSync(tmpModelPath))
		{
			this.log.error(`Model directory not found: ${tmpModelPath}`);
			return fCallback(new Error('Model directory not found'));
		}

		if (!libFs.statSync(tmpModelPath).isDirectory())
		{
			this.log.error(`Model path is not a directory: ${tmpModelPath}`);
			return fCallback(new Error('Model path is not a directory'));
		}

		let tmpPortOption = parseInt(this.CommandOptions.port, 10);
		let tmpPort = (tmpPortOption > 0) ? tmpPortOption : (7000 + Math.floor(Math.random() * 1000));

		let tmpSelf = this;
		let tmpSetupServer = require('../MigrationManager-Server-Setup.js');

		tmpSetupServer(
			{
				ModelPath: tmpModelPath,
				Port: tmpPort,
				FableSettings: this.fable.settings
			},
			function (pError, pServerInfo)
			{
				if (pError)
				{
					tmpSelf.log.error(`Failed to start server: ${pError.message}`);
					return fCallback(pError);
				}

				tmpSelf.log.info('');
				tmpSelf.log.info('==========================================================');
				tmpSelf.log.info(`  Meadow Migration Manager on http://localhost:${pServerInfo.Port}`);
				tmpSelf.log.info('==========================================================');
				tmpSelf.log.info(`  Model Path: ${tmpModelPath}`);
				tmpSelf.log.info(`  Schemas:    ${pServerInfo.SchemaCount}`);
				tmpSelf.log.info('==========================================================');
				tmpSelf.log.info('');
				tmpSelf.log.info('  Press Ctrl+C to stop.');
				tmpSelf.log.info('');

				// Intentionally do NOT call fCallback() here.
				// The server should keep running -- the Orator listener
				// keeps the event loop alive.
			});
	}
}

module.exports = MigrationManagerCommandServe;
