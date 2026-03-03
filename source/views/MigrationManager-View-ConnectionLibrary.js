/**
 * Meadow Migration Manager - Connection Library View
 *
 * Lists all connection configurations in the connection library. Displays
 * each connection's name, database type, and a summary of its configuration
 * (server, port, database name).
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewConnectionLibrary extends libPictView
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

MigrationManagerViewConnectionLibrary.default_configuration =
{
	ViewIdentifier: 'MigrationManager-ConnectionLibrary',

	DefaultRenderable: 'MigrationManager-ConnectionLibrary-Content',
	DefaultDestinationAddress: '#MigrationManager-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-ConnectionLibrary-Content',
			Template: [
				'<div id="MigrationManager-ConnectionLibrary">',
				'  <h2>Connection Library</h2>',
				'  <table class="connection-library-table">',
				'    <thead>',
				'      <tr>',
				'        <th>Name</th>',
				'        <th>Type</th>',
				'        <th>Configuration</th>',
				'      </tr>',
				'    </thead>',
				'    <tbody>',
				'      {~Ts:MigrationManager-ConnectionLibrary-Row:AppData.MigrationManager.ConnectionList~}',
				'    </tbody>',
				'  </table>',
				'</div>'
			].join('\n')
		},
		{
			Hash: 'MigrationManager-ConnectionLibrary-Row',
			Template: [
				'<tr data-connection="{~D:Record.Name~}">',
				'  <td>{~D:Record.Name~}</td>',
				'  <td>{~D:Record.Type~}</td>',
				'  <td>{~D:Record.ConfigSummary~}</td>',
				'</tr>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-ConnectionLibrary-Content',
			TemplateHash: 'MigrationManager-ConnectionLibrary-Content',
			DestinationAddress: '#MigrationManager-Content'
		}
	]
};

module.exports = MigrationManagerViewConnectionLibrary;
