/**
 * Meadow Migration Manager CLI Command - Generate Script
 *
 * Generates a SQL migration script from the differences between two schemas
 * in the library. When --connection is given, the named database connection
 * is introspected and used as the source (current state).
 *
 * Usage:
 *   meadow-migration generate-script <source-schema> <target-schema> [-t type] [-o file]
 *   meadow-migration generate-script --connection <conn> <target-schema> [-t type] [-o file]
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
			{ Name: '[source-schema]', Description: 'Source schema name (or target when using --connection).', Default: '' });
		this.options.CommandArguments.push(
			{ Name: '[target-schema]', Description: 'Target schema name.', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-t, --type <type>', Description: 'Database type (MySQL, PostgreSQL, MSSQL, SQLite).', Default: 'MySQL' });
		this.options.CommandOptions.push(
			{ Name: '-o, --output <file>', Description: 'Output file path.', Default: '' });
		this.options.CommandOptions.push(
			{ Name: '-c, --connection <name>', Description: 'Use a database connection as the source (current state).', Default: '' });

		this.addCommand();
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

		let tmpDatabaseType = (this.CommandOptions && this.CommandOptions.type) || 'MySQL';
		let tmpOutputFile = (this.CommandOptions && this.CommandOptions.output) || '';

		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');
		let tmpStrictureAdapter = this.fable.instantiateServiceProvider('StrictureAdapter');

		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			(pLoadError) =>
			{
				if (pLoadError)
				{
					this.log.error(`Error loading schema library from [${tmpSchemaLibraryFile}]: ${pLoadError.message}`);
					return fCallback();
				}

				// Resolve source schema
				let fResolveSource = (fNext) =>
				{
					if (tmpConnectionName)
					{
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
										if (pError) return fNext(pError);
										return fNext(null, pSchema);
									});
							});
					}
					else
					{
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

				// Resolve target schema
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

								// Diff the schemas
								let tmpSchemaDiff = this.fable.instantiateServiceProvider('SchemaDiff');
								let tmpDiffResult = tmpSchemaDiff.diffSchemas(pSourceSchema, pTargetSchema);

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
