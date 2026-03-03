/**
 * Meadow Migration Manager TUI View - Deployer
 *
 * Shows pre-deployment summary and status for deploying a schema to a
 * database connection.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Deployer',

	DefaultRenderable: 'TUI-Deployer-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Deployer-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Deployer-Content',
			TemplateHash: 'TUI-Deployer-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIDeployer extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpMM = this.pict.AppData.MigrationManager;
		let tmpContent = '';

		tmpContent += '{bold}Schema Deployer{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		tmpContent += '  Active Schema:     ' + (tmpMM.ActiveSchemaName ? '{cyan-fg}' + tmpMM.ActiveSchemaName + '{/cyan-fg}' : '{yellow-fg}(none){/yellow-fg}') + '\n';
		tmpContent += '  Active Connection: ' + (tmpMM.ActiveConnectionName ? '{cyan-fg}' + tmpMM.ActiveConnectionName + '{/cyan-fg}' : '{yellow-fg}(none){/yellow-fg}') + '\n\n';

		if (!tmpMM.ActiveSchemaName || !tmpMM.ActiveConnectionName)
		{
			tmpContent += '  {yellow-fg}Select both an active schema and connection to deploy.{/yellow-fg}\n';
		}
		else
		{
			let tmpSchema = tmpMM.Schemas[tmpMM.ActiveSchemaName];

			if (!tmpSchema || !tmpSchema.CompiledSchema)
			{
				tmpContent += '  {yellow-fg}Schema not yet compiled. Compile first.{/yellow-fg}\n';
			}
			else
			{
				let tmpTables = Array.isArray(tmpSchema.CompiledSchema.Tables) ? tmpSchema.CompiledSchema.Tables : [];
				tmpContent += '  Tables to create: {yellow-fg}' + tmpTables.length + '{/yellow-fg}\n\n';

				for (let i = 0; i < tmpTables.length; i++)
				{
					let tmpTable = tmpTables[i];
					let tmpColCount = Array.isArray(tmpTable.Columns) ? tmpTable.Columns.length : 0;
					tmpContent += '    ' + (tmpTable.TableName || 'Unknown').padEnd(25) + tmpColCount + ' columns\n';
				}

				tmpContent += '\n  Use the CLI to deploy:\n';
				tmpContent += '    meadow-migration deploy ' + tmpMM.ActiveSchemaName + ' ' + tmpMM.ActiveConnectionName + '\n';
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIDeployer;
module.exports.default_configuration = _ViewConfiguration;
