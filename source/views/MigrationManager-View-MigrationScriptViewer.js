/**
 * Meadow Migration Manager - Migration Script Viewer View
 *
 * Provides a read-only display of the generated migration SQL script.
 * Shows the full script text as produced by the MigrationGenerator service,
 * stored at AppData.MigrationManager.MigrationScript.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewMigrationScriptViewer extends libPictView
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

MigrationManagerViewMigrationScriptViewer.default_configuration =
{
	ViewIdentifier: 'MigrationManager-MigrationScriptViewer',

	DefaultRenderable: 'MigrationManager-MigrationScriptViewer-Content',
	DefaultDestinationAddress: '#MigrationManager-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-MigrationScriptViewer-Content',
			Template: [
				'<div id="MigrationManager-MigrationScriptViewer">',
				'  <h2>Migration Script</h2>',
				'  <div class="script-viewer-header">',
				'    <span>Schema: {~D:AppData.MigrationManager.ActiveSchemaName~}</span>',
				'    <span>Connection: {~D:AppData.MigrationManager.ActiveConnectionName~}</span>',
				'  </div>',
				'  <pre id="MigrationManager-MigrationScriptViewer-SQL" class="migration-script-sql">{~D:AppData.MigrationManager.MigrationScript~}</pre>',
				'</div>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-MigrationScriptViewer-Content',
			TemplateHash: 'MigrationManager-MigrationScriptViewer-Content',
			DestinationAddress: '#MigrationManager-Content'
		}
	]
};

module.exports = MigrationManagerViewMigrationScriptViewer;
