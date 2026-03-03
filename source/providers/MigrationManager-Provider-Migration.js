/**
 * Meadow Migration Manager - Migration Provider
 *
 * PictProvider that orchestrates the migration workflow pipeline:
 * introspect -> diff -> generate. Provides async methods for each step
 * of the pipeline and a convenience method that runs the full sequence.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictProvider = require('pict-provider');

class MigrationManagerProviderMigration extends libPictProvider
{
	/**
	 * @param {Object} pFable - The Fable/Pict instance
	 * @param {Object} pOptions - Provider configuration options
	 * @param {String} pServiceHash - The service hash
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'PictProvider';
	}

	/**
	 * Introspect the target database schema.
	 *
	 * Uses the SchemaIntrospector service to discover the current state of
	 * the database on the active connection. Stores the result in
	 * AppData.MigrationManager.IntrospectionResult.
	 *
	 * @param {String} pConnectionName - The connection name to introspect
	 * @param {Function} fCallback - Callback invoked as fCallback(pError, pResult)
	 */
	introspect(pConnectionName, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpIntrospector = this.fable.instantiateServiceProviderIfNotExists('SchemaIntrospector');

		if (!tmpIntrospector)
		{
			this.log.error('MigrationManager-Migration-Provider: SchemaIntrospector service not available.');
			return tmpCallback(new Error('SchemaIntrospector service not available'));
		}

		this.log.info(`MigrationManager-Migration-Provider: Introspecting connection [${pConnectionName}]...`);

		tmpIntrospector.introspect(pConnectionName,
			(pError, pResult) =>
			{
				if (pError)
				{
					this.log.error(`MigrationManager-Migration-Provider: Introspection failed: ${pError}`);
					return tmpCallback(pError);
				}

				this.fable.AppData.MigrationManager.IntrospectionResult = pResult;
				this.log.info('MigrationManager-Migration-Provider: Introspection complete.');
				return tmpCallback(null, pResult);
			});
	}

	/**
	 * Diff the source schema against the introspected database schema.
	 *
	 * Uses the SchemaDiff service to compare the compiled source schema
	 * against the introspection result. Stores the diff in
	 * AppData.MigrationManager.DiffResult.
	 *
	 * @param {String} pSchemaName - The source schema name from the library
	 * @param {Function} fCallback - Callback invoked as fCallback(pError, pDiffResult)
	 */
	diff(pSchemaName, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpDiffService = this.fable.instantiateServiceProviderIfNotExists('SchemaDiff');

		if (!tmpDiffService)
		{
			this.log.error('MigrationManager-Migration-Provider: SchemaDiff service not available.');
			return tmpCallback(new Error('SchemaDiff service not available'));
		}

		let tmpSchemaEntry = this.fable.AppData.MigrationManager.Schemas[pSchemaName];

		if (!tmpSchemaEntry || !tmpSchemaEntry.CompiledSchema)
		{
			this.log.error(`MigrationManager-Migration-Provider: Schema [${pSchemaName}] not found or not compiled.`);
			return tmpCallback(new Error(`Schema [${pSchemaName}] not found or not compiled`));
		}

		let tmpIntrospectionResult = this.fable.AppData.MigrationManager.IntrospectionResult;

		if (!tmpIntrospectionResult)
		{
			this.log.error('MigrationManager-Migration-Provider: No introspection result available. Run introspect first.');
			return tmpCallback(new Error('No introspection result available'));
		}

		this.log.info(`MigrationManager-Migration-Provider: Diffing schema [${pSchemaName}]...`);

		let tmpDiffResult = tmpDiffService.diff(tmpSchemaEntry.CompiledSchema, tmpIntrospectionResult);

		this.fable.AppData.MigrationManager.DiffResult = tmpDiffResult;
		this.log.info('MigrationManager-Migration-Provider: Diff complete.');
		return tmpCallback(null, tmpDiffResult);
	}

	/**
	 * Generate a migration script from the current diff result.
	 *
	 * Uses the MigrationGenerator service to produce SQL migration
	 * statements from the diff result. Stores the script in
	 * AppData.MigrationManager.MigrationScript.
	 *
	 * @param {Function} fCallback - Callback invoked as fCallback(pError, pScript)
	 */
	generateMigrationScript(fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		let tmpGenerator = this.fable.instantiateServiceProviderIfNotExists('MigrationGenerator');

		if (!tmpGenerator)
		{
			this.log.error('MigrationManager-Migration-Provider: MigrationGenerator service not available.');
			return tmpCallback(new Error('MigrationGenerator service not available'));
		}

		let tmpDiffResult = this.fable.AppData.MigrationManager.DiffResult;

		if (!tmpDiffResult)
		{
			this.log.error('MigrationManager-Migration-Provider: No diff result available. Run diff first.');
			return tmpCallback(new Error('No diff result available'));
		}

		this.log.info('MigrationManager-Migration-Provider: Generating migration script...');

		let tmpScript = tmpGenerator.generate(tmpDiffResult);

		this.fable.AppData.MigrationManager.MigrationScript = tmpScript;
		this.log.info('MigrationManager-Migration-Provider: Migration script generated.');
		return tmpCallback(null, tmpScript);
	}

	/**
	 * Run the full migration pipeline: introspect, diff, generate.
	 *
	 * Convenience method that runs all three pipeline stages in sequence
	 * for the given schema and connection names.
	 *
	 * @param {String} pSchemaName - The source schema name from the library
	 * @param {String} pConnectionName - The connection name to introspect
	 * @param {Function} fCallback - Callback invoked as fCallback(pError, pScript)
	 */
	runPipeline(pSchemaName, pConnectionName, fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => {};

		this.log.info(`MigrationManager-Migration-Provider: Running full pipeline for schema [${pSchemaName}] on connection [${pConnectionName}]...`);

		this.introspect(pConnectionName,
			(pIntrospectError) =>
			{
				if (pIntrospectError)
				{
					return tmpCallback(pIntrospectError);
				}

				this.diff(pSchemaName,
					(pDiffError) =>
					{
						if (pDiffError)
						{
							return tmpCallback(pDiffError);
						}

						this.generateMigrationScript(
							(pGenerateError, pScript) =>
							{
								if (pGenerateError)
								{
									return tmpCallback(pGenerateError);
								}

								this.log.info('MigrationManager-Migration-Provider: Full pipeline complete.');
								return tmpCallback(null, pScript);
							});
					});
			});
	}
}

MigrationManagerProviderMigration.default_configuration =
{
	ProviderIdentifier: 'MigrationManager-Migration-Provider',
	AutoInitialize: true,
	AutoLoadDataWithApp: false
};

module.exports = MigrationManagerProviderMigration;
