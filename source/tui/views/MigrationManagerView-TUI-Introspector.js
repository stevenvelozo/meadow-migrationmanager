/**
 * Meadow Migration Manager TUI View - Introspector
 *
 * Displays database introspection results for the active connection.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Introspector',

	DefaultRenderable: 'TUI-Introspector-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Introspector-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Introspector-Content',
			TemplateHash: 'TUI-Introspector-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIIntrospector extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpMM = this.pict.AppData.MigrationManager;
		let tmpContent = '';

		tmpContent += '{bold}Schema Introspector{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		tmpContent += '  Active Connection: ' + (tmpMM.ActiveConnectionName ? '{cyan-fg}' + tmpMM.ActiveConnectionName + '{/cyan-fg}' : '{yellow-fg}(none){/yellow-fg}') + '\n\n';

		if (!tmpMM.IntrospectionResult)
		{
			tmpContent += '  {yellow-fg}No introspection results available.{/yellow-fg}\n\n';
			tmpContent += '  Use the CLI to introspect a database:\n';
			tmpContent += '    meadow-migration introspect <connection>\n';
		}
		else
		{
			let tmpResult = tmpMM.IntrospectionResult;
			let tmpTables = Array.isArray(tmpResult.Tables) ? tmpResult.Tables : [];

			tmpContent += '  Discovered {yellow-fg}' + tmpTables.length + '{/yellow-fg} table(s):\n\n';

			for (let i = 0; i < tmpTables.length; i++)
			{
				let tmpTable = tmpTables[i];
				let tmpTableName = tmpTable.TableName || 'Unknown';
				let tmpColumns = Array.isArray(tmpTable.Columns) ? tmpTable.Columns : [];

				tmpContent += '  {bold}' + tmpTableName + '{/bold} (' + tmpColumns.length + ' columns)\n';

				for (let j = 0; j < tmpColumns.length; j++)
				{
					let tmpCol = tmpColumns[j];
					let tmpColName = (tmpCol.Column || 'Unknown').padEnd(25);
					tmpContent += '    ' + tmpColName + (tmpCol.DataType || 'Unknown') + '\n';
				}

				tmpContent += '\n';
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIIntrospector;
module.exports.default_configuration = _ViewConfiguration;
