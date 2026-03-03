/**
 * Meadow Migration Manager CLI Command - Generate Script
 *
 * Generates a SQL migration script from the differences between two schemas
 * in the library. Optionally writes the script to a file.
 *
 * Usage: meadow-migration generate-script <source-schema> <target-schema> [-t type] [-o file]
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFS = require('fs');
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandGenerateScript extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'generate-script';
		this.options.Description = 'Generate a SQL migration script from schema differences.';
		this.options.Aliases.push('gs');

		this.options.CommandArguments.push(
			{ Name: '[source-schema]', Description: 'Source schema name.', Default: '' });
		this.options.CommandArguments.push(
			{ Name: '[target-schema]', Description: 'Target schema name.', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-t, --type <type>', Description: 'Database type (MySQL, PostgreSQL, MSSQL, SQLite).', Default: 'MySQL' });
		this.options.CommandOptions.push(
			{ Name: '-o, --output <file>', Description: 'Output file path.', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpSchemaLibraryFile = this.fable.ProgramConfiguration.SchemaLibraryFile || '.meadow-migration-schemas.json';

		let tmpArgs = (typeof (this.ArgumentString) === 'string') ? this.ArgumentString.trim().split(/\s+/) : [];
		let tmpSourceName = tmpArgs[0] || '';
		let tmpTargetName = tmpArgs[1] || '';

		if (!tmpSourceName || !tmpTargetName)
		{
			this.log.error('Both <source-schema> and <target-schema> arguments are required.');
			return fCallback();
		}

		let tmpDatabaseType = (this.CommandOptions && this.CommandOptions.type) || 'MySQL';
		let tmpOutputFile = (this.CommandOptions && this.CommandOptions.output) || '';

		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');

		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			(pLoadError) =>
			{
				if (pLoadError)
				{
					this.log.error(`Error loading schema library from [${tmpSchemaLibraryFile}]: ${pLoadError.message}`);
					return fCallback();
				}

				let tmpSourceEntry = tmpSchemaLibrary.getSchema(tmpSourceName);
				let tmpTargetEntry = tmpSchemaLibrary.getSchema(tmpTargetName);

				if (!tmpSourceEntry)
				{
					this.log.error(`Source schema [${tmpSourceName}] not found in library.`);
					return fCallback();
				}
				if (!tmpTargetEntry)
				{
					this.log.error(`Target schema [${tmpTargetName}] not found in library.`);
					return fCallback();
				}

				let tmpStrictureAdapter = this.fable.instantiateServiceProvider('StrictureAdapter');

				// Compile source if needed
				let fCompileSource = (fNext) =>
				{
					if (tmpSourceEntry.CompiledSchema)
					{
						return fNext(null, tmpSourceEntry.CompiledSchema);
					}

					tmpStrictureAdapter.compileDDL(tmpSourceEntry.DDL,
						(pError, pSchema) =>
						{
							if (pError)
							{
								return fNext(pError);
							}
							tmpSourceEntry.CompiledSchema = pSchema;
							tmpSourceEntry.LastCompiled = new Date().toJSON();
							return fNext(null, pSchema);
						});
				};

				// Compile target if needed
				let fCompileTarget = (fNext) =>
				{
					if (tmpTargetEntry.CompiledSchema)
					{
						return fNext(null, tmpTargetEntry.CompiledSchema);
					}

					tmpStrictureAdapter.compileDDL(tmpTargetEntry.DDL,
						(pError, pSchema) =>
						{
							if (pError)
							{
								return fNext(pError);
							}
							tmpTargetEntry.CompiledSchema = pSchema;
							tmpTargetEntry.LastCompiled = new Date().toJSON();
							return fNext(null, pSchema);
						});
				};

				fCompileSource(
					(pSourceError, pSourceSchema) =>
					{
						if (pSourceError)
						{
							this.log.error(`Error compiling source schema [${tmpSourceName}]: ${pSourceError.message}`);
							return fCallback();
						}

						fCompileTarget(
							(pTargetError, pTargetSchema) =>
							{
								if (pTargetError)
								{
									this.log.error(`Error compiling target schema [${tmpTargetName}]: ${pTargetError.message}`);
									return fCallback();
								}

								// Convert compiled schemas to Tables arrays for diffing
								let tmpSourceTables = { Tables: [] };
								let tmpTargetTables = { Tables: [] };

								if (pSourceSchema && pSourceSchema.Tables)
								{
									let tmpTableKeys = Object.keys(pSourceSchema.Tables);
									for (let i = 0; i < tmpTableKeys.length; i++)
									{
										tmpSourceTables.Tables.push(pSourceSchema.Tables[tmpTableKeys[i]]);
									}
								}

								if (pTargetSchema && pTargetSchema.Tables)
								{
									let tmpTableKeys = Object.keys(pTargetSchema.Tables);
									for (let i = 0; i < tmpTableKeys.length; i++)
									{
										tmpTargetTables.Tables.push(pTargetSchema.Tables[tmpTableKeys[i]]);
									}
								}

								// Diff the schemas
								let tmpSchemaDiff = this.fable.instantiateServiceProvider('SchemaDiff');
								let tmpDiffResult = tmpSchemaDiff.diffSchemas(tmpSourceTables, tmpTargetTables);

								// Generate the migration script
								let tmpMigrationGenerator = this.fable.instantiateServiceProvider('MigrationGenerator');
								let tmpScript = tmpMigrationGenerator.generateMigrationScript(tmpDiffResult, tmpDatabaseType);

								if (tmpOutputFile)
								{
									try
									{
										libFS.writeFileSync(tmpOutputFile, tmpScript, 'utf8');
										this.log.info(`Migration script written to [${tmpOutputFile}]`);
									}
									catch (tmpWriteError)
									{
										this.log.error(`Error writing script to [${tmpOutputFile}]: ${tmpWriteError.message}`);
									}
								}
								else
								{
									// Output to console
									console.log(tmpScript);
								}

								return fCallback();
							});
					});
			});
	}
}

module.exports = MigrationManagerCommandGenerateScript;
