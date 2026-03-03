/**
 * Meadow Migration Manager CLI Command - List Schemas
 *
 * Lists all schemas currently stored in the schema library.
 *
 * Usage: meadow-migration list-schemas
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandListSchemas extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'list-schemas';
		this.options.Description = 'List all schemas in the library.';
		this.options.Aliases.push('ls');

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpSchemaLibraryFile = this.fable.ProgramConfiguration.SchemaLibraryFile || '.meadow-migration-schemas.json';

		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');

		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			(pError) =>
			{
				if (pError)
				{
					this.log.warn(`Could not load schema library from [${tmpSchemaLibraryFile}]: ${pError.message}`);
					this.log.info('No schemas found. Use "add-schema" to add one.');
					return fCallback();
				}

				let tmpSchemaNames = tmpSchemaLibrary.listSchemas();

				if (tmpSchemaNames.length === 0)
				{
					this.log.info('No schemas in library.');
					return fCallback();
				}

				this.log.info(`Schemas (${tmpSchemaNames.length}):`);

				for (let i = 0; i < tmpSchemaNames.length; i++)
				{
					let tmpSchema = tmpSchemaLibrary.getSchema(tmpSchemaNames[i]);
					let tmpCompiled = tmpSchema.LastCompiled ? `  (compiled ${tmpSchema.LastCompiled})` : '  (not compiled)';
					this.log.info(`  ${tmpSchemaNames[i]}${tmpCompiled}`);
				}

				return fCallback();
			});
	}
}

module.exports = MigrationManagerCommandListSchemas;
