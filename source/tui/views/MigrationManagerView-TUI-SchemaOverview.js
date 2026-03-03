/**
 * Meadow Migration Manager TUI View - Schema Overview
 *
 * Shows a summary of all schemas in the library with their names,
 * compiled status, and DDL preview.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-SchemaOverview',

	DefaultRenderable: 'TUI-SchemaOverview-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-SchemaOverview-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-SchemaOverview-Content',
			TemplateHash: 'TUI-SchemaOverview-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUISchemaOverview extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpSchemas = this.pict.AppData.MigrationManager.Schemas;
		let tmpSchemaNames = Object.keys(tmpSchemas);
		let tmpContent = '';

		tmpContent += '{bold}Schema Library{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		if (tmpSchemaNames.length === 0)
		{
			tmpContent += '  {yellow-fg}No schemas in library.{/yellow-fg}\n\n';
			tmpContent += '  Use the CLI to add schemas:\n';
			tmpContent += '    meadow-migration add-schema <name> <file>\n';
		}
		else
		{
			tmpContent += '  {yellow-fg}' + tmpSchemaNames.length + '{/yellow-fg} schema(s) loaded:\n\n';

			for (let i = 0; i < tmpSchemaNames.length; i++)
			{
				let tmpName = tmpSchemaNames[i];
				let tmpSchema = tmpSchemas[tmpName];
				let tmpCompiled = tmpSchema.CompiledSchema ? '{green-fg}Compiled{/green-fg}' : '{red-fg}Not Compiled{/red-fg}';
				let tmpActive = (tmpName === this.pict.AppData.MigrationManager.ActiveSchemaName) ? ' {cyan-fg}[ACTIVE]{/cyan-fg}' : '';

				tmpContent += '  {bold}' + tmpName + '{/bold}' + tmpActive + '\n';
				tmpContent += '    Status: ' + tmpCompiled + '\n';

				if (tmpSchema.DDL)
				{
					let tmpPreview = tmpSchema.DDL.substring(0, 60).replace(/\n/g, ' ');
					tmpContent += '    DDL: ' + tmpPreview + '...\n';
				}

				if (tmpSchema.LastCompiled)
				{
					tmpContent += '    Last Compiled: ' + tmpSchema.LastCompiled + '\n';
				}

				tmpContent += '\n';
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUISchemaOverview;
module.exports.default_configuration = _ViewConfiguration;
