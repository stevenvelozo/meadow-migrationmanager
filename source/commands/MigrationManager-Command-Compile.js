/**
 * Meadow Migration Manager CLI Command - Compile
 *
 * Compiles a DDL schema from the library using the StrictureAdapter service,
 * storing the compiled result back in the schema library entry.
 *
 * Usage: meadow-migration compile <schema>
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandCompile extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'compile';
		this.options.Description = 'Compile a DDL schema from the library.';
		this.options.Aliases.push('c');

		this.options.CommandArguments.push(
			{ Name: '[schema]', Description: 'Schema name from library.', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpSchemaLibraryFile = this.fable.ProgramConfiguration.SchemaLibraryFile || '.meadow-migration-schemas.json';

		let tmpSchemaName = this.ArgumentString || '';

		if (!tmpSchemaName)
		{
			this.log.error('The <schema> argument is required.');
			return fCallback();
		}

		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');

		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			(pLoadError) =>
			{
				if (pLoadError)
				{
					this.log.error(`Error loading schema library from [${tmpSchemaLibraryFile}]: ${pLoadError.message}`);
					return fCallback();
				}

				let tmpSchemaEntry = tmpSchemaLibrary.getSchema(tmpSchemaName);

				if (!tmpSchemaEntry)
				{
					this.log.error(`Schema [${tmpSchemaName}] not found in library.`);
					return fCallback();
				}

				let tmpStrictureAdapter = this.fable.instantiateServiceProvider('StrictureAdapter');

				tmpStrictureAdapter.compileDDL(tmpSchemaEntry.DDL,
					(pCompileError, pCompiledSchema) =>
					{
						if (pCompileError)
						{
							this.log.error(`Error compiling schema [${tmpSchemaName}]: ${pCompileError.message}`);
							return fCallback();
						}

						tmpSchemaEntry.CompiledSchema = pCompiledSchema;
						tmpSchemaEntry.LastCompiled = new Date().toJSON();

						this.log.info(`Schema [${tmpSchemaName}] compiled successfully.`);

						tmpSchemaLibrary.saveLibrary(tmpSchemaLibraryFile,
							(pSaveError) =>
							{
								if (pSaveError)
								{
									this.log.error(`Error saving schema library: ${pSaveError.message}`);
									return fCallback();
								}

								this.log.info(`Compiled schema saved to library [${tmpSchemaLibraryFile}].`);
								return fCallback();
							});
					});
			});
	}
}

module.exports = MigrationManagerCommandCompile;
