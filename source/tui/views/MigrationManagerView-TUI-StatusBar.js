/**
 * Meadow Migration Manager TUI View - Status Bar
 *
 * Renders the bottom status bar showing schema count, connection count,
 * and current view.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-StatusBar',

	DefaultRenderable: 'TUI-StatusBar-Content',
	DefaultDestinationAddress: '#TUI-StatusBar',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-StatusBar-Template',
			Template: ' Schemas: {~D:Record.SchemaCount~} | Connections: {~D:Record.ConnectionCount~}    View: {~D:Record.StatusMessage~}'
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-StatusBar-Content',
			TemplateHash: 'TUI-StatusBar-Template',
			ContentDestinationAddress: '#TUI-StatusBar',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIStatusBar extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

module.exports = MigrationManagerViewTUIStatusBar;
module.exports.default_configuration = _ViewConfiguration;
