/**
 * Meadow Migration Manager -- Server Setup
 *
 * Encapsulates all server initialization logic for the serve command.
 * Creates a MeadowMigrationManager instance, scans a model directory for
 * .mddl files, auto-imports and compiles them, then starts an Orator HTTP
 * server with JSON API endpoints and a static HTML web UI.
 *
 * @param {object} pOptions
 * @param {string} pOptions.ModelPath    - Absolute path to the directory containing .mddl files
 * @param {number} pOptions.Port         - HTTP port to listen on
 * @param {object} [pOptions.FableSettings] - Optional Fable settings to merge
 * @param {Function} fCallback           - Callback(pError, { Fable, Orator, Port, SchemaCount })
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libFs = require('fs');
const libPath = require('path');

const libMeadowMigrationManager = require('./MeadowMigrationManager.js');
const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');

/**
 * Scan a directory for DDL files (.mddl and .ddl) non-recursively.
 *
 * @param {string} pDirPath - Directory path to scan
 * @return {Array<string>} Array of absolute file paths
 */
function scanForDDLFiles(pDirPath)
{
	let tmpFiles = [];

	try
	{
		let tmpEntries = libFs.readdirSync(pDirPath);

		for (let i = 0; i < tmpEntries.length; i++)
		{
			let tmpEntry = tmpEntries[i];

			if (tmpEntry.endsWith('.mddl') || tmpEntry.endsWith('.ddl'))
			{
				tmpFiles.push(libPath.join(pDirPath, tmpEntry));
			}
		}
	}
	catch (pError)
	{
		// Directory read failed; return empty
	}

	return tmpFiles;
}

/**
 * Normalize a compiled schema's Tables property from hash to array.
 * Stricture Extended JSON returns Tables as a hash keyed by table name,
 * but SchemaDiff and SchemaVisualizer expect an array.
 *
 * @param {Object} pCompiledSchema - A compiled schema object
 * @return {Object} Schema with Tables normalized to array format
 */
function normalizeSchemaForDiff(pCompiledSchema)
{
	if (!pCompiledSchema || !pCompiledSchema.Tables)
	{
		return { Tables: [] };
	}

	if (Array.isArray(pCompiledSchema.Tables))
	{
		return pCompiledSchema;
	}

	// Convert hash to array
	let tmpNormalized = Object.assign({}, pCompiledSchema);
	let tmpTables = [];
	let tmpTableKeys = Object.keys(pCompiledSchema.Tables);

	for (let i = 0; i < tmpTableKeys.length; i++)
	{
		tmpTables.push(pCompiledSchema.Tables[tmpTableKeys[i]]);
	}

	tmpNormalized.Tables = tmpTables;
	return tmpNormalized;
}

/**
 * Recursively discover all DDL files referenced by [Include ...] directives.
 *
 * Returns a flat array of file entries, each with:
 *   { RelativePath, AbsolutePath, Content, IsMain }
 *
 * Uses a Set to prevent circular includes.
 * Validates resolved paths stay within pBaseDir (prevent directory traversal).
 *
 * @param {string} pFilePath - Absolute path to the DDL file to parse
 * @param {string} pBaseDir  - The base model directory for relative path calculation
 * @param {Set}    [pVisited] - Set of already-visited absolute paths (for cycle prevention)
 * @return {Array<Object>} Array of file descriptor objects
 */
function discoverIncludedFiles(pFilePath, pBaseDir, pVisited, pIncludedBy, pDepth)
{
	let tmpVisited = pVisited || new Set();
	let tmpResults = [];
	let tmpDepth = pDepth || 0;

	let tmpAbsPath = libPath.resolve(pFilePath);
	let tmpAbsBase = libPath.resolve(pBaseDir);

	// Prevent directory traversal outside base dir
	if (!tmpAbsPath.startsWith(tmpAbsBase))
	{
		return tmpResults;
	}

	// Prevent circular includes
	if (tmpVisited.has(tmpAbsPath))
	{
		return tmpResults;
	}

	tmpVisited.add(tmpAbsPath);

	let tmpContent = '';
	try
	{
		tmpContent = libFs.readFileSync(tmpAbsPath, 'utf8');
	}
	catch (pError)
	{
		// File unreadable; return empty
		return tmpResults;
	}

	let tmpRelPath = libPath.relative(tmpAbsBase, tmpAbsPath);

	tmpResults.push(
	{
		RelativePath: tmpRelPath,
		AbsolutePath: tmpAbsPath,
		Content: tmpContent,
		IsMain: (tmpVisited.size === 1),
		IncludedBy: pIncludedBy || null,
		Depth: tmpDepth
	});

	// Parse [Include ...] directives
	let tmpLines = tmpContent.split('\n');
	let tmpFileDir = libPath.dirname(tmpAbsPath);

	for (let i = 0; i < tmpLines.length; i++)
	{
		let tmpLine = tmpLines[i].trim();
		let tmpMatch = tmpLine.match(/^\[Include\s+(.+)\]$/i);

		if (tmpMatch)
		{
			let tmpIncludePath = tmpMatch[1].trim();
			let tmpIncludeAbs = libPath.resolve(tmpFileDir, tmpIncludePath);

			let tmpChildFiles = discoverIncludedFiles(tmpIncludeAbs, tmpAbsBase, tmpVisited, tmpRelPath, tmpDepth + 1);

			for (let j = 0; j < tmpChildFiles.length; j++)
			{
				tmpResults.push(tmpChildFiles[j]);
			}
		}
	}

	return tmpResults;
}

/**
 * Set up and start the Meadow Migration Manager Orator server.
 */
function setupMigrationManagerServer(pOptions, fCallback)
{
	let tmpModelPath = pOptions.ModelPath;
	let tmpPort = pOptions.Port;
	let tmpFableSettings = pOptions.FableSettings || {};

	// Merge settings
	let tmpSettings = Object.assign({},
		tmpFableSettings,
		{
			Product: 'MeadowMigrationManager-Web',
			ProductVersion: require('../package.json').version,
			APIServerPort: tmpPort
		});

	// Create the main migration manager instance (extends Pict, registers all service types)
	let tmpMM = new libMeadowMigrationManager(tmpSettings);

	// Register Orator service types
	tmpMM.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
	tmpMM.serviceManager.instantiateServiceProvider('OratorServiceServer');
	tmpMM.serviceManager.addServiceType('Orator', libOrator);
	let tmpOrator = tmpMM.serviceManager.instantiateServiceProvider('Orator');

	// Instantiate core services
	let tmpSchemaLibrary = tmpMM.instantiateServiceProvider('SchemaLibrary');
	let tmpStrictureAdapter = tmpMM.instantiateServiceProvider('StrictureAdapter');
	let tmpSchemaVisualizer = tmpMM.instantiateServiceProvider('SchemaVisualizer');
	let tmpSchemaDiff = tmpMM.instantiateServiceProvider('SchemaDiff');
	let tmpMigrationGenerator = tmpMM.instantiateServiceProvider('MigrationGenerator');
	let tmpFlowDataBuilder = tmpMM.instantiateServiceProvider('FlowDataBuilder');
	let tmpConnectionLibrary = tmpMM.instantiateServiceProvider('ConnectionLibrary');
	let tmpDatabaseProviderFactory = tmpMM.instantiateServiceProvider('DatabaseProviderFactory');

	// Load connections from cascading configuration (if available)
	tmpConnectionLibrary.loadFromConfiguration();

	// Scan model directory for DDL files and import them
	let tmpMDDLFiles = scanForDDLFiles(tmpModelPath);
	let tmpImportCount = 0;

	for (let i = 0; i < tmpMDDLFiles.length; i++)
	{
		tmpSchemaLibrary.importSchemaFromFile(tmpMDDLFiles[i],
			(pError, pEntry) =>
			{
				if (!pError && pEntry)
				{
					tmpImportCount++;
				}
			});
	}

	tmpMM.log.info(`Imported ${tmpImportCount} schema(s) from ${tmpModelPath}`);

	// Auto-compile all imported schemas
	let tmpSchemaNames = tmpSchemaLibrary.listSchemas();
	let tmpCompilesPending = tmpSchemaNames.length;
	let tmpCompilesDone = 0;

	function onAllCompiled()
	{
		tmpMM.log.info(`Compiled ${tmpCompilesDone} of ${tmpSchemaNames.length} schema(s).`);
		startServer();
	}

	if (tmpSchemaNames.length === 0)
	{
		startServer();
		return;
	}

	for (let i = 0; i < tmpSchemaNames.length; i++)
	{
		let tmpSchemaName = tmpSchemaNames[i];
		let tmpSchemaEntry = tmpSchemaLibrary.getSchema(tmpSchemaName);

		if (!tmpSchemaEntry || !tmpSchemaEntry.DDL)
		{
			tmpCompilesPending--;
			if (tmpCompilesPending <= 0)
			{
				onAllCompiled();
			}
			continue;
		}

		// Use file-based compilation when the source file path is known,
		// so that [Include ...] directives resolve correctly.
		let tmpCompileCallback = (pError, pCompiledSchema, pMeadowPackages) =>
			{
				if (!pError && pCompiledSchema)
				{
					tmpSchemaEntry.CompiledSchema = pCompiledSchema;
					tmpSchemaEntry.MeadowPackages = pMeadowPackages;
					tmpSchemaEntry.LastCompiled = new Date().toJSON();
					tmpCompilesDone++;
				}
				else if (pError)
				{
					tmpMM.log.warn(`Failed to compile schema [${tmpSchemaName}]: ${pError.message || pError}`);
				}

				tmpCompilesPending--;
				if (tmpCompilesPending <= 0)
				{
					onAllCompiled();
				}
			};

		if (tmpSchemaEntry.SourceFilePath)
		{
			tmpStrictureAdapter.compileFileAndGenerate(tmpSchemaEntry.SourceFilePath, tmpCompileCallback);
		}
		else
		{
			tmpStrictureAdapter.compileAndGenerate(tmpSchemaEntry.DDL, tmpCompileCallback);
		}
	}

	function startServer()
	{
		tmpOrator.initialize(
			function ()
			{
				let tmpServiceServer = tmpOrator.serviceServer;

				// Enable body parsing for POST/PUT requests
				tmpServiceServer.server.use(tmpServiceServer.bodyParser());

				// ============================================================
				// Static Routes
				// ============================================================

				// GET /lib/codejar.js — serve CodeJar as a global (strip ES module export)
				let tmpCodeJarPath = libPath.join(__dirname, '..', 'node_modules', 'codejar', 'dist', 'codejar.js');
				tmpServiceServer.get('/lib/codejar.js',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpSource = libFs.readFileSync(tmpCodeJarPath, 'utf8');
							// Strip the ES module `export ` keyword so CodeJar becomes a global function
							tmpSource = tmpSource.replace('export function CodeJar', 'function CodeJar');
							pResponse.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
							pResponse.write(tmpSource);
							pResponse.end();
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: 'Failed to load CodeJar.' });
						}
						return fNext();
					});

				// GET /lib/pict.min.js — serve Pict browser bundle
				let tmpPictPath = libPath.join(__dirname, '..', 'node_modules', 'pict', 'dist', 'pict.min.js');
				tmpServiceServer.get('/lib/pict.min.js',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpSource = libFs.readFileSync(tmpPictPath, 'utf8');
							pResponse.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
							pResponse.write(tmpSource);
							pResponse.end();
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: 'Failed to load Pict.' });
						}
						return fNext();
					});

				// GET /lib/pict-section-flow.min.js — serve pict-section-flow browser bundle
				let tmpFlowPath = libPath.join(__dirname, '..', 'node_modules', 'pict-section-flow', 'dist', 'pict-section-flow.min.js');
				tmpServiceServer.get('/lib/pict-section-flow.min.js',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpSource = libFs.readFileSync(tmpFlowPath, 'utf8');
							pResponse.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
							pResponse.write(tmpSource);
							pResponse.end();
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: 'Failed to load pict-section-flow.' });
						}
						return fNext();
					});

				// ============================================================
				// API Routes
				// ============================================================

				// GET /api/schemas — list all schemas with compiled status
				tmpServiceServer.get('/api/schemas',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpNames = tmpSchemaLibrary.listSchemas();
							let tmpSchemas = [];

							for (let i = 0; i < tmpNames.length; i++)
							{
								let tmpEntry = tmpSchemaLibrary.getSchema(tmpNames[i]);
								tmpSchemas.push(
								{
									Name: tmpEntry.Name,
									IsCompiled: !!tmpEntry.CompiledSchema,
									LastCompiled: tmpEntry.LastCompiled || null,
									TableCount: (tmpEntry.CompiledSchema && tmpEntry.CompiledSchema.Tables)
										? (Array.isArray(tmpEntry.CompiledSchema.Tables)
											? tmpEntry.CompiledSchema.Tables.length
											: Object.keys(tmpEntry.CompiledSchema.Tables).length)
										: 0,
									HasSourceFile: !!tmpEntry.SourceFilePath
								});
							}

							pResponse.send({ Success: true, Schemas: tmpSchemas });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// GET /api/schemas/:name — full schema detail
				tmpServiceServer.get('/api/schemas/:name',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							pResponse.send(
							{
								Success: true,
								Schema:
								{
									Name: tmpEntry.Name,
									DDL: tmpEntry.DDL,
									CompiledSchema: tmpEntry.CompiledSchema,
									MeadowPackages: tmpEntry.MeadowPackages,
									IsCompiled: !!tmpEntry.CompiledSchema,
									LastCompiled: tmpEntry.LastCompiled || null,
									HasSourceFile: !!tmpEntry.SourceFilePath
								}
							});
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// GET /api/schemas/:name/ddl — raw DDL text
				tmpServiceServer.get('/api/schemas/:name/ddl',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							pResponse.send({ Success: true, Name: tmpEntry.Name, DDL: tmpEntry.DDL });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// PUT /api/schemas/:name/ddl — update DDL text
				tmpServiceServer.put('/api/schemas/:name/ddl',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								// Create a new schema entry if it doesn't exist
								tmpEntry = tmpSchemaLibrary.addSchema(pRequest.params.name, '');
							}

							let tmpDDL = '';
							if (pRequest.body && typeof (pRequest.body) === 'object' && pRequest.body.DDL !== undefined)
							{
								tmpDDL = pRequest.body.DDL;
							}
							else if (typeof (pRequest.body) === 'string')
							{
								tmpDDL = pRequest.body;
							}

							tmpEntry.DDL = tmpDDL;
							// Clear compiled state when DDL changes
							tmpEntry.CompiledSchema = null;
							tmpEntry.MeadowPackages = null;
							tmpEntry.LastCompiled = null;

							// Also write back to the source file if it exists
							if (tmpEntry.SourceFilePath)
							{
								try
								{
									libFs.writeFileSync(tmpEntry.SourceFilePath, tmpDDL, 'utf8');
								}
								catch (pWriteError)
								{
									tmpMM.log.warn(`Failed to write back to source file [${tmpEntry.SourceFilePath}]: ${pWriteError.message}`);
								}
							}

							pResponse.send({ Success: true, Name: tmpEntry.Name });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// GET /api/schemas/:name/files — discover all DDL files (main + includes)
				tmpServiceServer.get('/api/schemas/:name/files',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							// If schema has a source file, discover included files
							if (tmpEntry.SourceFilePath)
							{
								let tmpFiles = discoverIncludedFiles(tmpEntry.SourceFilePath, tmpModelPath);

								pResponse.send(
								{
									Success: true,
									Name: tmpEntry.Name,
									HasSourceFile: true,
									Files: tmpFiles.map(function(pFile)
									{
										let tmpLines = pFile.Content.split('\n');
										let tmpTableCount = 0;
										for (let k = 0; k < tmpLines.length; k++)
										{
											if (tmpLines[k].trimStart().charAt(0) === '!')
											{
												tmpTableCount++;
											}
										}
										return {
											RelativePath: pFile.RelativePath,
											Content: pFile.Content,
											IsMain: pFile.IsMain,
											IncludedBy: pFile.IncludedBy || null,
											Depth: pFile.Depth || 0,
											Bytes: Buffer.byteLength(pFile.Content, 'utf8'),
											LineCount: tmpLines.length,
											TableCount: tmpTableCount
										};
									})
								});
							}
							else
							{
								// Programmatic schema — return a single virtual file entry
								let tmpDDL = tmpEntry.DDL || '';
								let tmpDDLLines = tmpDDL.split('\n');
								let tmpDDLTableCount = 0;
								for (let k = 0; k < tmpDDLLines.length; k++)
								{
									if (tmpDDLLines[k].trimStart().charAt(0) === '!')
									{
										tmpDDLTableCount++;
									}
								}
								pResponse.send(
								{
									Success: true,
									Name: tmpEntry.Name,
									HasSourceFile: false,
									Files:
									[
										{
											RelativePath: tmpEntry.Name + '.ddl',
											Content: tmpDDL,
											IsMain: true,
											IncludedBy: null,
											Depth: 0,
											Bytes: Buffer.byteLength(tmpDDL, 'utf8'),
											LineCount: tmpDDLLines.length,
											TableCount: tmpDDLTableCount
										}
									]
								});
							}
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// GET /api/schemas/:name/file/:filepath — read a specific child file by relative path
				tmpServiceServer.get('/api/schemas/:name/file/:filepath',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							if (!tmpEntry.SourceFilePath)
							{
								// Programmatic schema — return the DDL directly
								pResponse.send({ Success: true, Content: tmpEntry.DDL || '' });
								return fNext();
							}

							let tmpRelPath = decodeURIComponent(pRequest.params.filepath);
							let tmpAbsPath = libPath.resolve(tmpModelPath, tmpRelPath);
							let tmpAbsBase = libPath.resolve(tmpModelPath);

							// Prevent directory traversal
							if (!tmpAbsPath.startsWith(tmpAbsBase))
							{
								pResponse.send(403, { Success: false, Error: 'Path outside model directory.' });
								return fNext();
							}

							let tmpContent = libFs.readFileSync(tmpAbsPath, 'utf8');
							pResponse.send({ Success: true, RelativePath: tmpRelPath, Content: tmpContent });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// PUT /api/schemas/:name/file/:filepath — write updated content to a specific child file
				tmpServiceServer.put('/api/schemas/:name/file/:filepath',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							let tmpContent = '';
							if (pRequest.body && typeof (pRequest.body) === 'object' && pRequest.body.Content !== undefined)
							{
								tmpContent = pRequest.body.Content;
							}
							else if (typeof (pRequest.body) === 'string')
							{
								tmpContent = pRequest.body;
							}

							if (!tmpEntry.SourceFilePath)
							{
								// Programmatic schema — just update the DDL
								tmpEntry.DDL = tmpContent;
								tmpEntry.CompiledSchema = null;
								tmpEntry.MeadowPackages = null;
								tmpEntry.LastCompiled = null;
								pResponse.send({ Success: true });
								return fNext();
							}

							let tmpRelPath = decodeURIComponent(pRequest.params.filepath);
							let tmpAbsPath = libPath.resolve(tmpModelPath, tmpRelPath);
							let tmpAbsBase = libPath.resolve(tmpModelPath);

							// Prevent directory traversal
							if (!tmpAbsPath.startsWith(tmpAbsBase))
							{
								pResponse.send(403, { Success: false, Error: 'Path outside model directory.' });
								return fNext();
							}

							libFs.writeFileSync(tmpAbsPath, tmpContent, 'utf8');

							// If this is the main file, also update the schema entry DDL
							if (tmpAbsPath === libPath.resolve(tmpEntry.SourceFilePath))
							{
								tmpEntry.DDL = tmpContent;
							}

							// Clear compiled state since a file changed
							tmpEntry.CompiledSchema = null;
							tmpEntry.MeadowPackages = null;
							tmpEntry.LastCompiled = null;

							pResponse.send({ Success: true, RelativePath: tmpRelPath });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// POST /api/schemas/:name/compile — compile DDL
				tmpServiceServer.post('/api/schemas/:name/compile',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							if (!tmpEntry.DDL)
							{
								pResponse.send(400, { Success: false, Error: 'Schema has no DDL text to compile.' });
								return fNext();
							}

							// Use file-based compilation when source path is known
							let tmpCompileHandler = (pError, pCompiledSchema, pMeadowPackages) =>
								{
									if (pError)
									{
										pResponse.send(500, { Success: false, Error: `Compilation failed: ${pError.message || pError}` });
										return fNext();
									}

									tmpEntry.CompiledSchema = pCompiledSchema;
									tmpEntry.MeadowPackages = pMeadowPackages;
									tmpEntry.LastCompiled = new Date().toJSON();

									pResponse.send(
									{
										Success: true,
										Name: tmpEntry.Name,
										CompiledSchema: tmpEntry.CompiledSchema,
										MeadowPackages: tmpEntry.MeadowPackages,
										LastCompiled: tmpEntry.LastCompiled
									});
									return fNext();
								};

							if (tmpEntry.SourceFilePath)
							{
								// Re-read the main file in case it was edited via the file API
								try
								{
									tmpEntry.DDL = libFs.readFileSync(tmpEntry.SourceFilePath, 'utf8');
								}
								catch (pReadError)
								{
									// If we can't re-read, use the existing DDL
								}

								tmpStrictureAdapter.compileFileAndGenerate(tmpEntry.SourceFilePath, tmpCompileHandler);
							}
							else
							{
								tmpStrictureAdapter.compileAndGenerate(tmpEntry.DDL, tmpCompileHandler);
							}
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
							return fNext();
						}
					});

				// GET /api/schemas/:name/visualize — visualization data
				tmpServiceServer.get('/api/schemas/:name/visualize',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							if (!tmpEntry.CompiledSchema)
							{
								pResponse.send(400, { Success: false, Error: 'Schema has not been compiled yet.' });
								return fNext();
							}

							let tmpTableList = tmpSchemaVisualizer.generateTableList(tmpEntry.CompiledSchema);
							let tmpASCIIDiagram = tmpSchemaVisualizer.generateASCIIDiagram(tmpEntry.CompiledSchema);
							let tmpRelationshipMap = tmpSchemaVisualizer.generateRelationshipMap(tmpEntry.CompiledSchema);

							// Generate table details
							let tmpTableDetails = [];
							let tmpTables = Array.isArray(tmpEntry.CompiledSchema.Tables)
								? tmpEntry.CompiledSchema.Tables
								: Object.values(tmpEntry.CompiledSchema.Tables || {});

							for (let i = 0; i < tmpTables.length; i++)
							{
								tmpTableDetails.push(tmpSchemaVisualizer.generateTableDetail(tmpTables[i]));
							}

							// Build flow data for interactive visualization
							let tmpFlowData = tmpFlowDataBuilder.buildFlowData(tmpEntry.CompiledSchema);

							pResponse.send(
							{
								Success: true,
								Name: tmpEntry.Name,
								TableList: tmpTableList,
								ASCIIDiagram: tmpASCIIDiagram,
								RelationshipMap: tmpRelationshipMap,
								TableDetails: tmpTableDetails,
								FlowData: tmpFlowData
							});
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// GET /api/schemas/:name/meadow-packages — Meadow package JSON
				tmpServiceServer.get('/api/schemas/:name/meadow-packages',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

							if (!tmpEntry)
							{
								pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
								return fNext();
							}

							if (!tmpEntry.CompiledSchema)
							{
								pResponse.send(400, { Success: false, Error: 'Schema has not been compiled yet.' });
								return fNext();
							}

							let tmpPackages = tmpEntry.MeadowPackages || tmpStrictureAdapter.generateMeadowPackages(tmpEntry.CompiledSchema);

							pResponse.send(
							{
								Success: true,
								Name: tmpEntry.Name,
								MeadowPackages: tmpPackages
							});
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// ============================================================
				// Connection + Introspection API Routes
				// ============================================================

				// GET /api/providers — list available database provider types
				tmpServiceServer.get('/api/providers',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							pResponse.send(
							{
								Success: true,
								Providers: tmpDatabaseProviderFactory.listAvailableProviders()
							});
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// GET /api/connections — list all saved connections
				tmpServiceServer.get('/api/connections',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpNames = tmpConnectionLibrary.listConnections();
							let tmpConnections = [];

							for (let i = 0; i < tmpNames.length; i++)
							{
								let tmpEntry = tmpConnectionLibrary.getConnection(tmpNames[i]);
								tmpConnections.push(
								{
									Name: tmpEntry.Name,
									Type: tmpEntry.Type,
									Config:
									{
										server: tmpEntry.Config.server || tmpEntry.Config.host || '',
										port: tmpEntry.Config.port || '',
										user: tmpEntry.Config.user || '',
										database: tmpEntry.Config.database || ''
										// Intentionally omit password
									}
								});
							}

							pResponse.send({ Success: true, Connections: tmpConnections });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// POST /api/connections — add a new connection
				tmpServiceServer.post('/api/connections',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpName = pRequest.body && pRequest.body.Name;
							let tmpType = pRequest.body && pRequest.body.Type;
							let tmpConfig = pRequest.body && pRequest.body.Config;

							if (!tmpName || !tmpType || !tmpConfig)
							{
								pResponse.send(400, { Success: false, Error: 'Name, Type, and Config are required.' });
								return fNext();
							}

							tmpConnectionLibrary.addConnection(tmpName, tmpType, tmpConfig);

							pResponse.send({ Success: true, Name: tmpName });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// DELETE /api/connections/:name — remove a connection
				tmpServiceServer.del('/api/connections/:name',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpRemoved = tmpConnectionLibrary.removeConnection(pRequest.params.name);

							if (!tmpRemoved)
							{
								pResponse.send(404, { Success: false, Error: `Connection [${pRequest.params.name}] not found.` });
								return fNext();
							}

							pResponse.send({ Success: true });
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// POST /api/connections/:name/test — test a saved connection
				tmpServiceServer.post('/api/connections/:name/test',
					(pRequest, pResponse, fNext) =>
					{
						tmpDatabaseProviderFactory.testConnection(pRequest.params.name,
							(pError, pTableList) =>
							{
								if (pError)
								{
									pResponse.send(500, { Success: false, Error: `Connection test failed: ${pError.message || pError}` });
									return fNext();
								}

								pResponse.send(
								{
									Success: true,
									TableCount: pTableList.length,
									Tables: pTableList
								});
								return fNext();
							});
					});

				// POST /api/connections/test — test an unsaved connection config
				tmpServiceServer.post('/api/connections/test',
					(pRequest, pResponse, fNext) =>
					{
						let tmpType = pRequest.body && pRequest.body.Type;
						let tmpConfig = pRequest.body && pRequest.body.Config;

						if (!tmpType || !tmpConfig)
						{
							pResponse.send(400, { Success: false, Error: 'Type and Config are required.' });
							return fNext();
						}

						tmpDatabaseProviderFactory.testConnectionConfig(tmpType, tmpConfig,
							(pError, pTableList) =>
							{
								if (pError)
								{
									pResponse.send(500, { Success: false, Error: `Connection test failed: ${pError.message || pError}` });
									return fNext();
								}

								pResponse.send(
								{
									Success: true,
									TableCount: pTableList.length,
									Tables: pTableList
								});
								return fNext();
							});
					});

				// POST /api/connections/:name/introspect — introspect a saved connection
				// Optional body: { saveAs: 'schema-name' } — saves introspected schema to library
				tmpServiceServer.post('/api/connections/:name/introspect',
					(pRequest, pResponse, fNext) =>
					{
						tmpDatabaseProviderFactory.introspectConnection(pRequest.params.name,
							(pError, pSchema) =>
							{
								if (pError)
								{
									pResponse.send(500, { Success: false, Error: `Introspection failed: ${pError.message || pError}` });
									return fNext();
								}

								let tmpSaveAs = pRequest.body && pRequest.body.saveAs;

								if (tmpSaveAs)
								{
									// Save the introspected schema to the SchemaLibrary
									let tmpEntry = tmpSchemaLibrary.addSchema(tmpSaveAs, '');
									tmpEntry.CompiledSchema = pSchema;
									tmpEntry.LastCompiled = new Date().toJSON();

									pResponse.send(
									{
										Success: true,
										Schema: pSchema,
										SavedAs: tmpSaveAs
									});
									return fNext();
								}

								pResponse.send(
								{
									Success: true,
									Schema: pSchema
								});
								return fNext();
							});
					});

				// ============================================================
				// Diff + Migration API Routes
				// ============================================================

				// POST /api/schemas/diff — diff two schemas (supports DDL↔DDL, DDL↔DB, DB↔DDL, DB↔DB)
				// Body: { source?, target?, sourceConnection?, targetConnection? }
				tmpServiceServer.post('/api/schemas/diff',
					(pRequest, pResponse, fNext) =>
					{
						let tmpSourceName = pRequest.body && pRequest.body.source;
						let tmpTargetName = pRequest.body && pRequest.body.target;
						let tmpSourceConnection = pRequest.body && pRequest.body.sourceConnection;
						let tmpTargetConnection = pRequest.body && pRequest.body.targetConnection;

						// Resolve the source side
						let fResolveSource = (fDone) =>
						{
							if (tmpSourceConnection)
							{
								// Introspect a database as source
								tmpDatabaseProviderFactory.introspectConnection(tmpSourceConnection,
									(pError, pSchema) =>
									{
										if (pError)
										{
											return fDone(pError);
										}
										return fDone(null, pSchema, `DB:${tmpSourceConnection}`);
									});
							}
							else if (tmpSourceName)
							{
								let tmpSourceEntry = tmpSchemaLibrary.getSchema(tmpSourceName);

								if (!tmpSourceEntry)
								{
									return fDone(new Error(`Source schema [${tmpSourceName}] not found.`));
								}

								if (!tmpSourceEntry.CompiledSchema)
								{
									return fDone(new Error(`Source schema [${tmpSourceName}] has not been compiled.`));
								}

								return fDone(null, normalizeSchemaForDiff(tmpSourceEntry.CompiledSchema), tmpSourceName);
							}
							else
							{
								return fDone(new Error('Either source or sourceConnection is required.'));
							}
						};

						// Resolve the target side
						let fResolveTarget = (fDone) =>
						{
							if (tmpTargetConnection)
							{
								// Introspect a database as target
								tmpDatabaseProviderFactory.introspectConnection(tmpTargetConnection,
									(pError, pSchema) =>
									{
										if (pError)
										{
											return fDone(pError);
										}
										return fDone(null, pSchema, `DB:${tmpTargetConnection}`);
									});
							}
							else if (tmpTargetName)
							{
								let tmpTargetEntry = tmpSchemaLibrary.getSchema(tmpTargetName);

								if (!tmpTargetEntry)
								{
									return fDone(new Error(`Target schema [${tmpTargetName}] not found.`));
								}

								if (!tmpTargetEntry.CompiledSchema)
								{
									return fDone(new Error(`Target schema [${tmpTargetName}] has not been compiled.`));
								}

								return fDone(null, normalizeSchemaForDiff(tmpTargetEntry.CompiledSchema), tmpTargetName);
							}
							else
							{
								return fDone(new Error('Either target or targetConnection is required.'));
							}
						};

						fResolveSource(
							(pSourceError, pSourceSchema, pSourceLabel) =>
							{
								if (pSourceError)
								{
									pResponse.send(400, { Success: false, Error: pSourceError.message });
									return fNext();
								}

								fResolveTarget(
									(pTargetError, pTargetSchema, pTargetLabel) =>
									{
										if (pTargetError)
										{
											pResponse.send(400, { Success: false, Error: pTargetError.message });
											return fNext();
										}

										try
										{
											let tmpDiffResult = tmpSchemaDiff.diffSchemas(pSourceSchema, pTargetSchema);

											pResponse.send(
											{
												Success: true,
												Source: pSourceLabel,
												Target: pTargetLabel,
												Diff: tmpDiffResult
											});
										}
										catch (pDiffError)
										{
											pResponse.send(500, { Success: false, Error: pDiffError.message });
										}
										return fNext();
									});
							});
					});

				// POST /api/schemas/generate-migration — generate SQL migration script
				tmpServiceServer.post('/api/schemas/generate-migration',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpDiff = pRequest.body && pRequest.body.diff;
							let tmpDatabaseType = (pRequest.body && pRequest.body.databaseType) || 'MySQL';

							if (!tmpDiff)
							{
								pResponse.send(400, { Success: false, Error: 'A diff result object is required.' });
								return fNext();
							}

							let tmpScript = tmpMigrationGenerator.generateMigrationScript(tmpDiff, tmpDatabaseType);

							pResponse.send(
							{
								Success: true,
								DatabaseType: tmpDatabaseType,
								Script: tmpScript
							});
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: pError.message });
						}
						return fNext();
					});

				// GET / — serve the web UI HTML
				let tmpHTMLPath = libPath.join(__dirname, 'web', 'index.html');
				tmpServiceServer.get('/',
					(pRequest, pResponse, fNext) =>
					{
						try
						{
							let tmpHTML = libFs.readFileSync(tmpHTMLPath, 'utf8');
							pResponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
							pResponse.write(tmpHTML);
							pResponse.end();
						}
						catch (pError)
						{
							pResponse.send(500, { Success: false, Error: 'Failed to load web UI.' });
						}
						return fNext();
					});

				// Start the server
				tmpOrator.startService(
					function ()
					{
						return fCallback(null,
						{
							Fable: tmpMM,
							Orator: tmpOrator,
							Port: tmpPort,
							SchemaCount: tmpSchemaLibrary.listSchemas().length
						});
					});
			});
	}
}

module.exports = setupMigrationManagerServer;
