/**
 * Meadow Migration Manager CLI Command - Diff
 *
 * Compares two schemas from the library and prints a summary of differences.
 *
 * Usage: meadow-migration diff <source-schema> <target-schema>
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandDiff extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'diff';
		this.options.Description = 'Compare two schemas and show differences.';
		this.options.Aliases.push('d');

		this.options.CommandArguments.push(
			{ Name: '[source-schema]', Description: 'Source schema name.', Default: '' });
		this.options.CommandArguments.push(
			{ Name: '[target-schema]', Description: 'Target schema name.', Default: '' });

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

								let tmpSchemaDiff = this.fable.instantiateServiceProvider('SchemaDiff');
								let tmpDiffResult = tmpSchemaDiff.diffSchemas(tmpSourceTables, tmpTargetTables);

								// Print summary
								this.log.info(`Schema Diff: [${tmpSourceName}] -> [${tmpTargetName}]`);
								this.log.info(`  Tables added:    ${tmpDiffResult.TablesAdded.length}`);
								this.log.info(`  Tables removed:  ${tmpDiffResult.TablesRemoved.length}`);
								this.log.info(`  Tables modified: ${tmpDiffResult.TablesModified.length}`);

								if (tmpDiffResult.TablesAdded.length > 0)
								{
									this.log.info('');
									this.log.info('  Added tables:');
									for (let i = 0; i < tmpDiffResult.TablesAdded.length; i++)
									{
										this.log.info(`    + ${tmpDiffResult.TablesAdded[i].TableName}`);
									}
								}

								if (tmpDiffResult.TablesRemoved.length > 0)
								{
									this.log.info('');
									this.log.info('  Removed tables:');
									for (let i = 0; i < tmpDiffResult.TablesRemoved.length; i++)
									{
										this.log.info(`    - ${tmpDiffResult.TablesRemoved[i].TableName}`);
									}
								}

								if (tmpDiffResult.TablesModified.length > 0)
								{
									this.log.info('');
									this.log.info('  Modified tables:');
									for (let i = 0; i < tmpDiffResult.TablesModified.length; i++)
									{
										let tmpMod = tmpDiffResult.TablesModified[i];
										this.log.info(`    ~ ${tmpMod.TableName}`);

										for (let j = 0; j < tmpMod.ColumnsAdded.length; j++)
										{
											this.log.info(`        + column: ${tmpMod.ColumnsAdded[j].Column}`);
										}
										for (let j = 0; j < tmpMod.ColumnsRemoved.length; j++)
										{
											this.log.info(`        - column: ${tmpMod.ColumnsRemoved[j].Column}`);
										}
										for (let j = 0; j < tmpMod.ColumnsModified.length; j++)
										{
											this.log.info(`        ~ column: ${tmpMod.ColumnsModified[j].Column}`);
										}
									}
								}

								if (tmpDiffResult.TablesAdded.length === 0 &&
									tmpDiffResult.TablesRemoved.length === 0 &&
									tmpDiffResult.TablesModified.length === 0)
								{
									this.log.info('  No differences detected.');
								}

								return fCallback();
							});
					});
			});
	}
}

module.exports = MigrationManagerCommandDiff;
