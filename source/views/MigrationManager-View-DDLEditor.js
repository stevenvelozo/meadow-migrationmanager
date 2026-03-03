/**
 * Meadow Migration Manager - DDL Editor View
 *
 * Provides a text editor interface for editing the MicroDDL text of the
 * currently active schema. The textarea is bound to the active schema's DDL
 * content via AppData.MigrationManager.ActiveSchemaDDL.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

class MigrationManagerViewDDLEditor extends libPictView
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

MigrationManagerViewDDLEditor.default_configuration =
{
	ViewIdentifier: 'MigrationManager-DDLEditor',

	DefaultRenderable: 'MigrationManager-DDLEditor-Content',
	DefaultDestinationAddress: '#MigrationManager-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'MigrationManager-DDLEditor-Content',
			Template: [
				'<div id="MigrationManager-DDLEditor">',
				'  <h2>DDL Editor</h2>',
				'  <div class="ddl-editor-header">',
				'    <span>Schema: {~D:AppData.MigrationManager.ActiveSchemaName~}</span>',
				'  </div>',
				'  <div class="ddl-editor-body">',
				'    <textarea id="MigrationManager-DDLEditor-Textarea" class="ddl-editor-textarea" rows="24" cols="80">{~D:AppData.MigrationManager.ActiveSchemaDDL~}</textarea>',
				'  </div>',
				'  <div class="ddl-editor-actions">',
				'    <button id="MigrationManager-DDLEditor-Save">Save DDL</button>',
				'    <button id="MigrationManager-DDLEditor-Compile">Compile</button>',
				'  </div>',
				'</div>'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'MigrationManager-DDLEditor-Content',
			TemplateHash: 'MigrationManager-DDLEditor-Content',
			DestinationAddress: '#MigrationManager-Content'
		}
	]
};

module.exports = MigrationManagerViewDDLEditor;
