/**
 * Meadow Migration Manager - Meadow Config Viewer View
 *
 * Displays a read-only formatted JSON view of the Meadow packages generated
 * from the active schema's compiled output. Shows the package configuration
 * that would be used by Meadow entities.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewMeadowConfigViewer extends libPictView
{
	/**
	 * @param {Object} pFable - The Fable/Pict instance
	 * @param {Object} pOptions - View configuration options
	 * @param {String} pServiceHash - The service hash
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'PictView';
	}
}

MigrationManagerViewMeadowConfigViewer.default_configuration =
{
	ViewIdentifier: 'MigrationManager-MeadowConfigViewer',

	DefaultRenderable: 'MigrationManager-MeadowConfigViewer-Content',
	DefaultDestinationAddress: '#MigrationManager-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-MeadowConfigViewer-Content',
			Template: [
				'<div id="MigrationManager-MeadowConfigViewer">',
				'  <h2>Meadow Configuration</h2>',
				'  <div class="meadow-config-header">',
				'    <span>Schema: {~D:AppData.MigrationManager.ActiveSchemaName~}</span>',
				'  </div>',
				'  <pre id="MigrationManager-MeadowConfigViewer-JSON" class="meadow-config-json">{~D:AppData.MigrationManager.MeadowConfigJSON~}</pre>',
				'</div>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-MeadowConfigViewer-Content',
			TemplateHash: 'MigrationManager-MeadowConfigViewer-Content',
			DestinationAddress: '#MigrationManager-Content'
		}
	]
};

module.exports = MigrationManagerViewMeadowConfigViewer;
