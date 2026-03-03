/**
 * Meadow Migration Manager TUI View - Visualizer
 *
 * Shows ASCII diagram and relationship map for the active schema using
 * the SchemaVisualizer service.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Visualizer',

	DefaultRenderable: 'TUI-Visualizer-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Visualizer-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Visualizer-Content',
			TemplateHash: 'TUI-Visualizer-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIVisualizer extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpMM = this.pict.AppData.MigrationManager;
		let tmpContent = '';

		tmpContent += '{bold}Schema Visualizer{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		if (!tmpMM.ActiveSchemaName)
		{
			tmpContent += '  {yellow-fg}No active schema selected.{/yellow-fg}\n';
		}
		else
		{
			let tmpSchema = tmpMM.Schemas[tmpMM.ActiveSchemaName];

			if (!tmpSchema || !tmpSchema.CompiledSchema)
			{
				tmpContent += '  Schema: {cyan-fg}' + tmpMM.ActiveSchemaName + '{/cyan-fg}\n\n';
				tmpContent += '  {yellow-fg}Schema not yet compiled.{/yellow-fg}\n';
			}
			else
			{
				let tmpVisualizer = this.pict.instantiateServiceProvider('SchemaVisualizer');
				let tmpCompiled = tmpSchema.CompiledSchema;

				tmpContent += '  Schema: {cyan-fg}' + tmpMM.ActiveSchemaName + '{/cyan-fg}\n\n';

				// Table list
				tmpContent += tmpVisualizer.generateTableList(tmpCompiled) + '\n\n';

				// Relationship map
				tmpContent += tmpVisualizer.generateRelationshipMap(tmpCompiled) + '\n\n';

				// ASCII diagram
				tmpContent += '{bold}ASCII Diagram:{/bold}\n\n';
				tmpContent += tmpVisualizer.generateASCIIDiagram(tmpCompiled) + '\n';
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIVisualizer;
module.exports.default_configuration = _ViewConfiguration;
