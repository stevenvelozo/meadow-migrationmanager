/**
 * Meadow Migration Manager CLI Command - Introspect
 *
 * Introspects a live database to discover its schema. Requires an active
 * database connection and the appropriate provider package to be installed.
 *
 * Usage: meadow-migration introspect <connection> [-o name]
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class MigrationManagerCommandIntrospect extends libCommandLineCommand
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.options.CommandKeyword = 'introspect';
		this.options.Description = 'Introspect a live database to discover its schema.';
		this.options.Aliases.push('i');

		this.options.CommandArguments.push(
			{ Name: '[connection]', Description: 'Connection name.', Default: '' });

		this.options.CommandOptions.push(
			{ Name: '-o, --output <name>', Description: 'Save introspected schema to library with this name.', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpConnectionLibraryFile = this.fable.ProgramConfiguration.ConnectionLibraryFile || '.meadow-migration-connections.json';

		let tmpConnectionName = this.ArgumentString || '';

		if (!tmpConnectionName)
		{
			this.log.error('The <connection> argument is required.');
			return fCallback();
		}

		let tmpConnectionLibrary = this.fable.instantiateServiceProvider('ConnectionLibrary');
		let tmpDatabaseProviderFactory = this.fable.instantiateServiceProvider('DatabaseProviderFactory');

		tmpConnectionLibrary.loadLibrary(tmpConnectionLibraryFile,
			(pLoadError) =>
			{
				if (pLoadError)
				{
					this.log.error(`Error loading connection library from [${tmpConnectionLibraryFile}]: ${pLoadError.message}`);
					return fCallback();
				}

				let tmpConnection = tmpConnectionLibrary.getConnection(tmpConnectionName);

				if (!tmpConnection)
				{
					this.log.error(`Connection [${tmpConnectionName}] not found in library.`);
					return fCallback();
				}

				this.log.info(`Introspecting database via connection [${tmpConnectionName}]...`);
				this.log.info(`  Type:     ${tmpConnection.Type}`);
				this.log.info(`  Server:   ${tmpConnection.Config.server || tmpConnection.Config.host || '(default)'}`);
				this.log.info(`  Port:     ${tmpConnection.Config.port || '(default)'}`);
				this.log.info(`  Database: ${tmpConnection.Config.database || '(not set)'}`);
				this.log.info('');

				tmpDatabaseProviderFactory.introspectConnection(tmpConnectionName,
					(pError, pSchema) =>
					{
						if (pError)
						{
							this.log.error(`Introspection failed: ${pError.message || pError}`);
							return fCallback();
						}

						let tmpTableCount = (pSchema && pSchema.Tables) ? pSchema.Tables.length : 0;
						this.log.info(`Introspection complete — ${tmpTableCount} table(s) discovered.`);

						if (pSchema && pSchema.Tables)
						{
							for (let i = 0; i < pSchema.Tables.length; i++)
							{
								let tmpTable = pSchema.Tables[i];
								let tmpColCount = Array.isArray(tmpTable.Columns) ? tmpTable.Columns.length : 0;
								this.log.info(`  ${tmpTable.TableName} (${tmpColCount} columns)`);
							}
						}

						// Optionally save to schema library
						let tmpOutputName = (this.CommandOptions && this.CommandOptions.output) || '';

						if (tmpOutputName)
						{
							let tmpSchemaLibraryFile = this.fable.ProgramConfiguration.SchemaLibraryFile || '.meadow-migration-schemas.json';
							let tmpSchemaLibrary = this.fable.instantiateServiceProvider('SchemaLibrary');

							// Try to load existing library first
							tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
								(pLibLoadError) =>
								{
									// Ignore load errors — we may be creating a new library
									let tmpEntry = tmpSchemaLibrary.addSchema(tmpOutputName, '');

									// Store the introspected schema as the compiled schema
									tmpEntry.CompiledSchema = pSchema;
									tmpEntry.LastCompiled = new Date().toJSON();

									tmpSchemaLibrary.saveLibrary(tmpSchemaLibraryFile,
										(pSaveError) =>
										{
											if (pSaveError)
											{
												this.log.error(`Error saving schema library: ${pSaveError.message}`);
											}
											else
											{
												this.log.info(`Introspected schema saved to library as [${tmpOutputName}].`);
											}

											return fCallback();
										});
								});
						}
						else
						{
							return fCallback();
						}
					});
			});
	}
}

module.exports = MigrationManagerCommandIntrospect;
