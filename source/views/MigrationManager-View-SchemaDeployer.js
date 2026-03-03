/**
 * Meadow Migration Manager - Schema Deployer View
 *
 * Provides a deployment interface for deploying a compiled schema to a
 * selected database connection. Displays a pre-deployment summary of the
 * tables and indices to be created, along with a confirmation UI.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewSchemaDeployer extends libPictView
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

MigrationManagerViewSchemaDeployer.default_configuration =
{
	ViewIdentifier: 'MigrationManager-SchemaDeployer',

	DefaultRenderable: 'MigrationManager-SchemaDeployer-Content',
	DefaultDestinationAddress: '#MigrationManager-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-SchemaDeployer-Content',
			Template: [
				'<div id="MigrationManager-SchemaDeployer">',
				'  <h2>Schema Deployer</h2>',
				'  <div class="deployer-summary">',
				'    <h3>Pre-Deploy Summary</h3>',
				'    <div class="deployer-detail">',
				'      <span>Schema: {~D:AppData.MigrationManager.ActiveSchemaName~}</span>',
				'    </div>',
				'    <div class="deployer-detail">',
				'      <span>Connection: {~D:AppData.MigrationManager.ActiveConnectionName~}</span>',
				'    </div>',
				'    <div class="deployer-detail">',
				'      <span>Tables to create: {~D:AppData.MigrationManager.DeployTableCount~}</span>',
				'    </div>',
				'  </div>',
				'  <div class="deployer-confirmation">',
				'    <p>Are you sure you want to deploy this schema?</p>',
				'    <button id="MigrationManager-SchemaDeployer-Confirm">Deploy Schema</button>',
				'    <button id="MigrationManager-SchemaDeployer-Cancel">Cancel</button>',
				'  </div>',
				'  <div id="MigrationManager-SchemaDeployer-Status" class="deployer-status">',
				'    <span>{~D:AppData.MigrationManager.DeployStatus~}</span>',
				'  </div>',
				'</div>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-SchemaDeployer-Content',
			TemplateHash: 'MigrationManager-SchemaDeployer-Content',
			DestinationAddress: '#MigrationManager-Content'
		}
	]
};

module.exports = MigrationManagerViewSchemaDeployer;
