/**
 * Meadow Migration Manager TUI View - Layout
 *
 * Root layout view that triggers rendering of all child views when
 * it is rendered itself.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Layout',

	DefaultRenderable: 'TUI-Layout-Main',
	DefaultDestinationAddress: '#TUI-Application-Container',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Layout-Template',
			Template: '{~LV:Pict.PictApplication.renderLayoutWidgets()~}'
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Layout-Main',
			TemplateHash: 'TUI-Layout-Template',
			ContentDestinationAddress: '#TUI-Application-Container',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUILayout extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		// Trigger child views to render
		if (this.pict.views['TUI-Header'])
		{
			this.pict.views['TUI-Header'].render();
		}
		if (this.pict.views['TUI-SchemaOverview'])
		{
			this.pict.views['TUI-SchemaOverview'].render();
		}
		if (this.pict.views['TUI-StatusBar'])
		{
			this.pict.views['TUI-StatusBar'].render();
		}
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUILayout;
module.exports.default_configuration = _ViewConfiguration;
