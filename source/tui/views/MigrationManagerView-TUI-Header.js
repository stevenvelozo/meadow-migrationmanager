/**
 * Meadow Migration Manager TUI View - Header
 *
 * Renders the title bar with the application name and keyboard shortcut hints.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Header',

	DefaultRenderable: 'TUI-Header-Content',
	DefaultDestinationAddress: '#TUI-Header',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Header-Template',
			Template: '{center}{bold}Meadow Migration Manager{/bold}{/center}\n{center}[Tab] Switch Focus   [Enter] Select   [Q]uit{/center}'
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Header-Content',
			TemplateHash: 'TUI-Header-Template',
			ContentDestinationAddress: '#TUI-Header',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIHeader extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

module.exports = MigrationManagerViewTUIHeader;
module.exports.default_configuration = _ViewConfiguration;
