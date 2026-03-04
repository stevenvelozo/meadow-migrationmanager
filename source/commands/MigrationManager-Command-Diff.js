/**
 * Meadow Migration Manager CLI Command - Diff
 *
 * Compares two schemas from the library and prints a summary of differences.
 * When --connection is given, the named database connection is introspected
 * and used as the source schema (current DB state), and the first positional
 * argument becomes the target schema (desired DDL state).
 *
 * Usage:
 *   meadow-migration diff <source-schema> <target-schema>
 *   meadow-migration diff --connection <conn> <target-schema>
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
			{ Name: '[source-schema]', Description: 'Source schema name (or target when using --connection).', Default: '' });
		this.options.CommandArguments.push(
			{ Name: '[target-schema]', Description: 'Target schema name.', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-c, --connection <name>', Description: 'Use a database connection as the source (current state).', Default: '' });

		this.addCommand();
	}

	/**
	 * Print a diff result summary to the console.
	 */
	_printDiffSummary(pSourceLabel, pTargetLabel, pDiffResult)
	{
		this.log.info(`Schema Diff: [${pSourceLabel}] -> [${pTargetLabel}]`);
		this.log.info(`  Tables added:    ${pDiffResult.TablesAdded.length}`);
		this.log.info(`  Tables removed:  ${pDiffResult.TablesRemoved.length}`);
		this.log.info(`  Tables modified: ${pDiffResult.TablesModified.length}`);

		if (pDiffResult.TablesAdded.length > 0)
		{
			this.log.info('');
			this.log.info('  Added tables:');
			for (let i = 0; i < pDiffResult.TablesAdded.length; i++)
			{
				this.log.info(`    + ${pDiffResult.TablesAdded[i].TableName}`);
			}
		}

		if (pDiffResult.TablesRemoved.length > 0)
		{
			this.log.info('');
			this.log.info('  Removed tables:');
			for (let i = 0; i < pDiffResult.TablesRemoved.length; i++)
			{
				this.log.info(`    - ${pDiffResult.TablesRemoved[i].TableName}`);
			}
		}

		if (pDiffResult.TablesModified.length > 0)
		{
			this.log.info('');
			this.log.info('  Modified tables:');
			for (let i = 0; i < pDiffResult.TablesModified.length; i++)
			{
				let tmpMod = pDiffResult.TablesModified[i];
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

		if (pDiffResult.TablesAdded.length === 0 &&
			pDiffResult.TablesRemoved.length === 0 &&
			pDiffResult.TablesModified.length === 0)
		{
			this.log.info('  No differences detected.');
		}
	}

	/**
	 * Normalize a compiled schema's Tables property from hash to array.
	 */
	_normalizeCompiledSchema(pCompiledSchema)
	{
		let tmpResult = { Tables: [] };

		if (pCompiledSchema && pCompiledSchema.Tables)
		{
			if (Array.isArray(pCompiledSchema.Tables))
			{
				tmpResult.Tables = pCompiledSchema.Tables;
			}
			else
			{
				let tmpTableKeys = Object.keys(pCompiledSchema.Tables);
				for (let i = 0; i < tmpTableKeys.length; i++)
				{
					tmpResult.Tables.push(pCompiledSchema.Tables[tmpTableKeys[i]]);
				}
			}
		}

		return tmpResult;
	}

	onRunAsync(fCallback)
	{
		let tmpSchemaLibraryFile = this.fable.ProgramConfiguration.SchemaLibraryFile || '.meadow-migration-schemas.json';
		let tmpConnectionLibraryFile = this.fable.ProgramConfiguration.ConnectionLibraryFile || '.meadow-migration-connections.json';

		let tmpArgs = (typeof (this.ArgumentString) === 'string') ? this.ArgumentString.trim().split(/\s+/) : [];
		let tmpConnectionName = (this.CommandOptions && this.CommandOptions.connection) || '';

		// When using --connection, the first arg is the target schema
		let tmpSourceName = tmpConnectionName ? '' : (tmpArgs[0] || '');
		let tmpTargetName = tmpConnectionName ? (tmpArgs[0] || '') : (tmpArgs[1] || '');

		if (!tmpConnectionName && (!tmpSourceName || !tmpTargetName))
		{
			this.log.error('Both <source-schema> and <target-schema> arguments are required (or use --connection for source).');
			return fCallback();
		}

		if (tmpConnectionName && !tmpTargetName)
		{
			this.log.error('A <target-schema> argument is required when using --connection.');
			return fCallback();
		}

		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');
		let tmpStrictureAdapter = this.fable.instantiateServiceProvider('StrictureAdapter');
		let tmpSchemaDiff = this.fable.instantiateServiceProvider('SchemaDiff');

		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			(pLoadError) =>
			{
				if (pLoadError)
				{
					this.log.error(`Error loading schema library from [${tmpSchemaLibraryFile}]: ${pLoadError.message}`);
					return fCallback();
				}

				// Resolve source schema (either from connection or library)
				let fResolveSource = (fNext) =>
				{
					if (tmpConnectionName)
					{
						// Introspect the database as the source
						let tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');
						let tmpDatabaseProviderFactory = this.fable.instantiateServiceProvider('DatabaseProviderFactory');

						tmpConnectionLibrary.loadLibrary(tmpConnectionLibraryFile,
							(pConnLoadError) =>
							{
								if (pConnLoadError)
								{
									return fNext(new Error(`Error loading connection library: ${pConnLoadError.message}`));
								}

								this.log.info(`Introspecting database [${tmpConnectionName}] as source...`);

								tmpDatabaseProviderFactory.introspectConnection(tmpConnectionName,
									(pError, pSchema) =>
									{
										if (pError)
										{
											return fNext(pError);
										}

										// Introspected schema is already in { Tables: [...] } format
										return fNext(null, pSchema);
									});
							});
					}
					else
					{
						// Load from schema library
						let tmpSourceEntry = tmpSchemaLibrary.getSchema(tmpSourceName);

						if (!tmpSourceEntry)
						{
							return fNext(new Error(`Source schema [${tmpSourceName}] not found in library.`));
						}

						if (tmpSourceEntry.CompiledSchema)
						{
							return fNext(null, this._normalizeCompiledSchema(tmpSourceEntry.CompiledSchema));
						}

						tmpStrictureAdapter.compileDDL(tmpSourceEntry.DDL,
							(pError, pSchema) =>
							{
								if (pError) return fNext(pError);
								tmpSourceEntry.CompiledSchema = pSchema;
								tmpSourceEntry.LastCompiled = new Date().toJSON();
								return fNext(null, this._normalizeCompiledSchema(pSchema));
							});
					}
				};

				// Resolve target schema (always from library)
				let fResolveTarget = (fNext) =>
				{
					let tmpTargetEntry = tmpSchemaLibrary.getSchema(tmpTargetName);

					if (!tmpTargetEntry)
					{
						return fNext(new Error(`Target schema [${tmpTargetName}] not found in library.`));
					}

					if (tmpTargetEntry.CompiledSchema)
					{
						return fNext(null, this._normalizeCompiledSchema(tmpTargetEntry.CompiledSchema));
					}

					tmpStrictureAdapter.compileDDL(tmpTargetEntry.DDL,
						(pError, pSchema) =>
						{
							if (pError) return fNext(pError);
							tmpTargetEntry.CompiledSchema = pSchema;
							tmpTargetEntry.LastCompiled = new Date().toJSON();
							return fNext(null, this._normalizeCompiledSchema(pSchema));
						});
				};

				fResolveSource(
					(pSourceError, pSourceSchema) =>
					{
						if (pSourceError)
						{
							this.log.error(`Error resolving source: ${pSourceError.message}`);
							return fCallback();
						}

						fResolveTarget(
							(pTargetError, pTargetSchema) =>
							{
								if (pTargetError)
								{
									this.log.error(`Error resolving target: ${pTargetError.message}`);
									return fCallback();
								}

								let tmpDiffResult = tmpSchemaDiff.diffSchemas(pSourceSchema, pTargetSchema);
								let tmpSourceLabel = tmpConnectionName ? `DB:${tmpConnectionName}` : tmpSourceName;

								this._printDiffSummary(tmpSourceLabel, tmpTargetName, tmpDiffResult);

								return fCallback();
							});
					});
			});
	}
}

module.exports = MigrationManagerCommandDiff;
