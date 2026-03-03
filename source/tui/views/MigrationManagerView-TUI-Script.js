/**
 * Meadow Migration Manager TUI View - Migration Script
 *
 * Displays the generated migration SQL script.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Script',

	DefaultRenderable: 'TUI-Script-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Script-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Script-Content',
			TemplateHash: 'TUI-Script-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIScript extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpMM = this.pict.AppData.MigrationManager;
		let tmpContent = '';

		tmpContent += '{bold}Migration Script{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		if (!tmpMM.MigrationScript)
		{
			tmpContent += '  {yellow-fg}No migration script generated.{/yellow-fg}\n\n';
			tmpContent += '  Use the CLI to generate a script:\n';
			tmpContent += '    meadow-migration generate-script <source> <target> --type MySQL\n';
		}
		else
		{
			// Display the script with line numbers
			let tmpLines = tmpMM.MigrationScript.split('\n');
			for (let i = 0; i < tmpLines.length; i++)
			{
				let tmpLineNum = String(i + 1).padStart(4, ' ');
				tmpContent += '  {gray-fg}' + tmpLineNum + '{/gray-fg}  ' + tmpLines[i] + '\n';
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIScript;
module.exports.default_configuration = _ViewConfiguration;
