/**
 * Meadow Migration Manager - Schema Library View
 *
 * Lists all schemas currently loaded in the schema library. Displays each
 * schema's name, a DDL text preview, compiled status, and last compiled
 * timestamp. Reads schema data from AppData.MigrationManager.Schemas before
 * each render.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewSchemaLibrary extends libPictView
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

	/**
	 * Prepare the schema list data before rendering.
	 *
	 * Reads from AppData.MigrationManager.Schemas and builds a flat array
	 * of schema summary records at AppData.MigrationManager.SchemaList for
	 * template consumption.
	 *
	 * @param {Object} pRenderable - The renderable being rendered
	 */
	onBeforeRender(pRenderable)
	{
		let tmpSchemas = this.fable.AppData.MigrationManager.Schemas;
		let tmpSchemaList = [];

		let tmpSchemaNames = Object.keys(tmpSchemas);

		for (let i = 0; i < tmpSchemaNames.length; i++)
		{
			let tmpEntry = tmpSchemas[tmpSchemaNames[i]];
			let tmpDDLPreview = (typeof (tmpEntry.DDL) === 'string' && tmpEntry.DDL.length > 80)
				? tmpEntry.DDL.substring(0, 80) + '...'
				: (tmpEntry.DDL || '');

			tmpSchemaList.push(
			{
				Name: tmpEntry.Name,
				DDLPreview: tmpDDLPreview,
				IsCompiled: tmpEntry.CompiledSchema ? 'Yes' : 'No',
				LastCompiled: tmpEntry.LastCompiled || 'Never'
			});
		}

		this.fable.AppData.MigrationManager.SchemaList = tmpSchemaList;

		return super.onBeforeRender(pRenderable);
	}
}

MigrationManagerViewSchemaLibrary.default_configuration =
{
	ViewIdentifier: 'MigrationManager-SchemaLibrary',

	DefaultRenderable: 'MigrationManager-SchemaLibrary-Content',
	DefaultDestinationAddress: '#MigrationManager-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-SchemaLibrary-Content',
			Template: [
				'<div id="MigrationManager-SchemaLibrary">',
				'  <h2>Schema Library</h2>',
				'  <table class="schema-library-table">',
				'    <thead>',
				'      <tr>',
				'        <th>Name</th>',
				'        <th>DDL Preview</th>',
				'        <th>Compiled</th>',
				'        <th>Last Compiled</th>',
				'      </tr>',
				'    </thead>',
				'    <tbody>',
				'      {~Ts:MigrationManager-SchemaLibrary-Row:AppData.MigrationManager.SchemaList~}',
				'    </tbody>',
				'  </table>',
				'</div>'
			].join('\n')
		},
		{
			Hash: 'MigrationManager-SchemaLibrary-Row',
			Template: [
				'<tr data-schema="{~D:Record.Name~}">',
				'  <td>{~D:Record.Name~}</td>',
				'  <td><code>{~D:Record.DDLPreview~}</code></td>',
				'  <td>{~D:Record.IsCompiled~}</td>',
				'  <td>{~D:Record.LastCompiled~}</td>',
				'</tr>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-SchemaLibrary-Content',
			TemplateHash: 'MigrationManager-SchemaLibrary-Content',
			DestinationAddress: '#MigrationManager-Content'
		}
	]
};

module.exports = MigrationManagerViewSchemaLibrary;
