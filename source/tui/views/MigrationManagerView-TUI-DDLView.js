/**
 * Meadow Migration Manager TUI View - DDL View
 *
 * Displays the MicroDDL text for the currently active schema.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-DDLView',

	DefaultRenderable: 'TUI-DDLView-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-DDLView-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-DDLView-Content',
			TemplateHash: 'TUI-DDLView-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIDDLView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpMM = this.pict.AppData.MigrationManager;
		let tmpContent = '';

		tmpContent += '{bold}DDL Editor{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		if (!tmpMM.ActiveSchemaName)
		{
			tmpContent += '  {yellow-fg}No active schema selected.{/yellow-fg}\n';
			tmpContent += '  Select a schema from the Schema Library first.\n';
		}
		else
		{
			let tmpSchema = tmpMM.Schemas[tmpMM.ActiveSchemaName];

			if (!tmpSchema)
			{
				tmpContent += '  {red-fg}Active schema not found in library.{/red-fg}\n';
			}
			else
			{
				tmpContent += '  Schema: {cyan-fg}' + tmpMM.ActiveSchemaName + '{/cyan-fg}\n\n';

				if (tmpSchema.DDL)
				{
					// Display DDL with line numbers
					let tmpLines = tmpSchema.DDL.split('\n');
					for (let i = 0; i < tmpLines.length; i++)
					{
						let tmpLineNum = String(i + 1).padStart(4, ' ');
						tmpContent += '  {gray-fg}' + tmpLineNum + '{/gray-fg}  ' + tmpLines[i] + '\n';
					}
				}
				else
				{
					tmpContent += '  {yellow-fg}(empty DDL){/yellow-fg}\n';
				}
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIDDLView;
module.exports.default_configuration = _ViewConfiguration;
