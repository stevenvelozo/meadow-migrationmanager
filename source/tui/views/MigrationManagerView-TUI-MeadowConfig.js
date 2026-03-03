/**
 * Meadow Migration Manager TUI View - Meadow Config
 *
 * Displays the generated Meadow package JSON for the active schema.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-MeadowConfig',

	DefaultRenderable: 'TUI-MeadowConfig-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-MeadowConfig-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-MeadowConfig-Content',
			TemplateHash: 'TUI-MeadowConfig-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIMeadowConfig extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpMM = this.pict.AppData.MigrationManager;
		let tmpContent = '';

		tmpContent += '{bold}Meadow Configuration{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		if (!tmpMM.ActiveSchemaName)
		{
			tmpContent += '  {yellow-fg}No active schema selected.{/yellow-fg}\n';
			tmpContent += '  Compile a schema first to view Meadow packages.\n';
		}
		else
		{
			let tmpSchema = tmpMM.Schemas[tmpMM.ActiveSchemaName];

			if (!tmpSchema || !tmpSchema.MeadowPackages)
			{
				tmpContent += '  Schema: {cyan-fg}' + tmpMM.ActiveSchemaName + '{/cyan-fg}\n\n';
				tmpContent += '  {yellow-fg}Schema not yet compiled.{/yellow-fg}\n';
				tmpContent += '  Use: meadow-migration compile ' + tmpMM.ActiveSchemaName + '\n';
			}
			else
			{
				tmpContent += '  Schema: {cyan-fg}' + tmpMM.ActiveSchemaName + '{/cyan-fg}\n';
				tmpContent += '  Packages: {yellow-fg}' + tmpSchema.MeadowPackages.length + '{/yellow-fg}\n\n';

				for (let i = 0; i < tmpSchema.MeadowPackages.length; i++)
				{
					let tmpPkg = tmpSchema.MeadowPackages[i];
					tmpContent += '  {bold}' + (tmpPkg.Scope || 'Unknown') + '{/bold}\n';
					tmpContent += '    ' + JSON.stringify(tmpPkg, null, 2).split('\n').join('\n    ') + '\n\n';
				}
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIMeadowConfig;
module.exports.default_configuration = _ViewConfiguration;
