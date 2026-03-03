/**
 * Meadow Migration Manager CLI Command - Add Schema
 *
 * Imports a DDL schema from a file and adds it to the schema library.
 *
 * Usage: meadow-migration add-schema <name> <file>
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFS = require('fs');
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandAddSchema extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'add-schema';
		this.options.Description = 'Add a DDL schema to the library from a file.';
		this.options.Aliases.push('as');

		this.options.CommandArguments.push(
			{ Name: '[name]', Description: 'Schema name.', Default: '' });
		this.options.CommandArguments.push(
			{ Name: '[file]', Description: 'Path to DDL file.', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpSchemaLibraryFile = this.fable.ProgramConfiguration.SchemaLibraryFile || '.meadow-migration-schemas.json';

		// Parse arguments: first is schema name, second is file path
		let tmpArgs = (typeof (this.ArgumentString) === 'string') ? this.ArgumentString.trim().split(/\s+/) : [];
		let tmpName = tmpArgs[0] || '';
		let tmpFile = tmpArgs[1] || '';

		if (!tmpName || !tmpFile)
		{
			this.log.error('Both <name> and <file> arguments are required.');
			return fCallback();
		}

		// Read the DDL file
		let tmpDDLText;
		try
		{
			tmpDDLText = libFS.readFileSync(tmpFile, 'utf8');
		}
		catch (tmpError)
		{
			this.log.error(`Error reading DDL file [${tmpFile}]: ${tmpError.message}`);
			return fCallback();
		}

		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');

		// Try to load existing library first (ignore error if file does not exist)
		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			() =>
			{
				tmpSchemaLibrary.addSchema(tmpName, tmpDDLText);

				tmpSchemaLibrary.saveLibrary(tmpSchemaLibraryFile,
					(pSaveError) =>
					{
						if (pSaveError)
						{
							this.log.error(`Error saving schema library: ${pSaveError.message}`);
							return fCallback();
						}

						this.log.info(`Schema [${tmpName}] added to library and saved to [${tmpSchemaLibraryFile}].`);
						return fCallback();
					});
			});
	}
}

module.exports = MigrationManagerCommandAddSchema;
