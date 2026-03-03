/**
 * Meadow Migration Manager - Schema Introspector View
 *
 * Displays the results of database introspection. Shows discovered tables,
 * their columns (with data types and sizes), and any indices found on the
 * target connection. Reads introspection data from
 * AppData.MigrationManager.IntrospectionResult.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewSchemaIntrospector extends libPictView
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

MigrationManagerViewSchemaIntrospector.default_configuration =
{
	ViewIdentifier: 'MigrationManager-SchemaIntrospector',

	DefaultRenderable: 'MigrationManager-SchemaIntrospector-Content',
	DefaultDestinationAddress: '#MigrationManager-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-SchemaIntrospector-Content',
			Template: [
				'<div id="MigrationManager-SchemaIntrospector">',
				'  <h2>Schema Introspector</h2>',
				'  <div class="introspector-header">',
				'    <span>Connection: {~D:AppData.MigrationManager.ActiveConnectionName~}</span>',
				'  </div>',
				'  <div class="introspector-actions">',
				'    <button id="MigrationManager-SchemaIntrospector-Run">Run Introspection</button>',
				'  </div>',
				'  <div class="introspector-results">',
				'    <h3>Discovered Tables</h3>',
				'    <table class="introspector-table">',
				'      <thead>',
				'        <tr>',
				'          <th>Table</th>',
				'          <th>Columns</th>',
				'          <th>Indices</th>',
				'        </tr>',
				'      </thead>',
				'      <tbody>',
				'        {~Ts:MigrationManager-SchemaIntrospector-Row:AppData.MigrationManager.IntrospectionTableList~}',
				'      </tbody>',
				'    </table>',
				'  </div>',
				'</div>'
			].join('\n')
		},
		{
			Hash: 'MigrationManager-SchemaIntrospector-Row',
			Template: [
				'<tr data-table="{~D:Record.TableName~}">',
				'  <td>{~D:Record.TableName~}</td>',
				'  <td>{~D:Record.ColumnSummary~}</td>',
				'  <td>{~D:Record.IndexSummary~}</td>',
				'</tr>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-SchemaIntrospector-Content',
			TemplateHash: 'MigrationManager-SchemaIntrospector-Content',
			DestinationAddress: '#MigrationManager-Content'
		}
	]
};

module.exports = MigrationManagerViewSchemaIntrospector;
