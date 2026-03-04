/**
 * Meadow Migration Manager CLI Command - Migrate
 *
 * Runs a migration on a live database, applying schema changes to bring it
 * in line with the target schema. Introspects the database (source), diffs
 * against the DDL schema (target), generates migration SQL, and prints it.
 *
 * Usage: meadow-migration migrate <schema> <connection> [-t type]
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
		this.options.Description = 'Generate migration SQL for a live database to match a schema.';
		this.options.Aliases.push('m');

		this.options.CommandArguments.push(
			{ Name: '[schema]', Description: 'Target schema name (desired state).', Default: '' });
		this.options.CommandArguments.push(
			{ Name: '[connection]', Description: 'Connection name (current state).', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-t, --type <type>', Description: 'Database type override (MySQL, PostgreSQL, MSSQL, SQLite).', Default: '' });

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
		let tmpSchemaName = tmpArgs[0] || '';
		let tmpConnectionName = tmpArgs[1] || '';

		if (!tmpSchemaName || !tmpConnectionName)
		{
			this.log.error('Both <schema> and <connection> arguments are required.');
			return fCallback();
		}

		let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');
		let tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');
		let tmpStrictureAdapter = this.fable.instantiateServiceProvider('StrictureAdapter');
		let tmpDatabaseProviderFactory = this.fable.instantiateServiceProvider('DatabaseProviderFactory');
		let tmpSchemaDiff = this.fable.instantiateServiceProvider('SchemaDiff');
		let tmpMigrationGenerator = this.fable.instantiateServiceProvider('MigrationGenerator');

		// Load both libraries
		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			(pSchemaLoadError) =>
			{
				if (pSchemaLoadError)
				{
					this.log.error(`Error loading schema library: ${pSchemaLoadError.message}`);
					return fCallback();
				}

				tmpConnectionLibrary.loadLibrary(tmpConnectionLibraryFile,
					(pConnLoadError) =>
					{
						if (pConnLoadError)
						{
							this.log.error(`Error loading connection library: ${pConnLoadError.message}`);
							return fCallback();
						}

						let tmpSchemaEntry = tmpSchemaLibrary.getSchema(tmpSchemaName);

						if (!tmpSchemaEntry)
						{
							this.log.error(`Schema [${tmpSchemaName}] not found in library.`);
							return fCallback();
						}

						let tmpConnection = tmpConnectionLibrary.getConnection(tmpConnectionName);

						if (!tmpConnection)
						{
							this.log.error(`Connection [${tmpConnectionName}] not found in library.`);
							return fCallback();
						}

						// Determine database type (from option, or from connection)
						let tmpDatabaseType = (this.CommandOptions && this.CommandOptions.type) || tmpConnection.Type || 'MySQL';

						this.log.info(`Migrate: [${tmpSchemaName}] -> DB:[${tmpConnectionName}] (${tmpDatabaseType})`);

						// Step 1: Compile the target DDL schema
						let fCompileTarget = (fNext) =>
						{
							if (tmpSchemaEntry.CompiledSchema)
							{
								return fNext(null, this._normalizeCompiledSchema(tmpSchemaEntry.CompiledSchema));
							}

							tmpStrictureAdapter.compileDDL(tmpSchemaEntry.DDL,
								(pError, pSchema) =>
								{
									if (pError) return fNext(pError);
									tmpSchemaEntry.CompiledSchema = pSchema;
									tmpSchemaEntry.LastCompiled = new Date().toJSON();
									return fNext(null, this._normalizeCompiledSchema(pSchema));
								});
						};

						// Step 2: Introspect the database
						let fIntrospectSource = (fNext) =>
						{
							this.log.info('Introspecting database...');

							tmpDatabaseProviderFactory.introspectConnection(tmpConnectionName,
								(pError, pSchema) =>
								{
									if (pError) return fNext(pError);
									return fNext(null, pSchema);
								});
						};

						fCompileTarget(
							(pTargetError, pTargetSchema) =>
							{
								if (pTargetError)
								{
									this.log.error(`Error compiling schema [${tmpSchemaName}]: ${pTargetError.message}`);
									return fCallback();
								}

								fIntrospectSource(
									(pSourceError, pSourceSchema) =>
									{
										if (pSourceError)
										{
											this.log.error(`Error introspecting database: ${pSourceError.message}`);
											return fCallback();
										}

										// Step 3: Diff — source is DB (current), target is DDL (desired)
										let tmpDiffResult = tmpSchemaDiff.diffSchemas(pSourceSchema, pTargetSchema);

										this.log.info(`Diff: ${tmpDiffResult.TablesAdded.length} added, ${tmpDiffResult.TablesRemoved.length} removed, ${tmpDiffResult.TablesModified.length} modified`);

										// Step 4: Generate migration script
										let tmpScript = tmpMigrationGenerator.generateMigrationScript(tmpDiffResult, tmpDatabaseType);

										console.log('');
										console.log(tmpScript);

										return fCallback();
									});
							});
					});
			});
	}
}

module.exports = MigrationManagerCommandMigrate;
