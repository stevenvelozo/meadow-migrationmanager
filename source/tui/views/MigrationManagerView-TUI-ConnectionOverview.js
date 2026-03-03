/**
 * Meadow Migration Manager TUI View - Connection Overview
 *
 * Shows all connections in the library with their names, types,
 * and configuration summaries.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-ConnectionOverview',

	DefaultRenderable: 'TUI-ConnectionOverview-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-ConnectionOverview-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-ConnectionOverview-Content',
			TemplateHash: 'TUI-ConnectionOverview-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIConnectionOverview extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpConnections = this.pict.AppData.MigrationManager.Connections;
		let tmpConnectionNames = Object.keys(tmpConnections);
		let tmpContent = '';

		tmpContent += '{bold}Connection Library{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		if (tmpConnectionNames.length === 0)
		{
			tmpContent += '  {yellow-fg}No connections configured.{/yellow-fg}\n\n';
			tmpContent += '  Use the CLI to add connections:\n';
			tmpContent += '    meadow-migration add-connection <name> --type MySQL --server 127.0.0.1\n';
		}
		else
		{
			tmpContent += '  {yellow-fg}' + tmpConnectionNames.length + '{/yellow-fg} connection(s) configured:\n\n';

			for (let i = 0; i < tmpConnectionNames.length; i++)
			{
				let tmpName = tmpConnectionNames[i];
				let tmpConn = tmpConnections[tmpName];
				let tmpActive = (tmpName === this.pict.AppData.MigrationManager.ActiveConnectionName) ? ' {cyan-fg}[ACTIVE]{/cyan-fg}' : '';

				tmpContent += '  {bold}' + tmpName + '{/bold}' + tmpActive + '\n';
				tmpContent += '    Type: {yellow-fg}' + (tmpConn.Type || 'Unknown') + '{/yellow-fg}\n';

				if (tmpConn.Config)
				{
					if (tmpConn.Config.server)
					{
						tmpContent += '    Server: ' + tmpConn.Config.server;
						if (tmpConn.Config.port)
						{
							tmpContent += ':' + tmpConn.Config.port;
						}
						tmpContent += '\n';
					}
					if (tmpConn.Config.database)
					{
						tmpContent += '    Database: ' + tmpConn.Config.database + '\n';
					}
				}

				tmpContent += '\n';
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIConnectionOverview;
module.exports.default_configuration = _ViewConfiguration;
