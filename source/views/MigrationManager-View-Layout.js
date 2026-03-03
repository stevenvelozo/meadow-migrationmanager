/**
 * Meadow Migration Manager - Layout View
 *
 * Master layout view providing a sidebar navigation panel and a main content
 * area container. All other views render their content into the
 * #MigrationManager-Content container within this layout.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewLayout extends libPictView
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

MigrationManagerViewLayout.default_configuration =
{
	ViewIdentifier: 'MigrationManager-Layout',

	DefaultRenderable: 'MigrationManager-Layout-Content',
	DefaultDestinationAddress: '#MigrationManager-Layout-Container',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-Layout-Content',
			Template: [
				'<div id="MigrationManager-Layout" class="migration-manager-layout">',
				'  <div id="MigrationManager-Sidebar" class="migration-manager-sidebar">',
				'    <h3>Migration Manager</h3>',
				'    <ul class="migration-manager-nav">',
				'      <li><a data-nav="SchemaLibrary">Schema Library</a></li>',
				'      <li><a data-nav="ConnectionLibrary">Connections</a></li>',
				'      <li><a data-nav="DDLEditor">DDL Editor</a></li>',
				'      <li><a data-nav="MeadowConfigViewer">Meadow Config</a></li>',
				'      <li><a data-nav="SchemaVisualizer">Schema Visualizer</a></li>',
				'      <li><a data-nav="SchemaDeployer">Schema Deployer</a></li>',
				'      <li><a data-nav="SchemaMigrator">Schema Migrator</a></li>',
				'      <li><a data-nav="MigrationScriptViewer">Migration Scripts</a></li>',
				'      <li><a data-nav="SchemaIntrospector">Introspector</a></li>',
				'    </ul>',
				'  </div>',
				'  <div id="MigrationManager-Content" class="migration-manager-content">',
				'  </div>',
				'</div>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-Layout-Content',
			TemplateHash: 'MigrationManager-Layout-Content',
			DestinationAddress: '#MigrationManager-Layout-Container'
		}
	]
};

module.exports = MigrationManagerViewLayout;
