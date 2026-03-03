/**
 * Meadow Migration Manager TUI View - Migrator
 *
 * Shows diff results between schemas and migration status.
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Migrator',

	DefaultRenderable: 'TUI-Migrator-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TUI',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Migrator-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Migrator-Content',
			TemplateHash: 'TUI-Migrator-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class MigrationManagerViewTUIMigrator extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		let tmpMM = this.pict.AppData.MigrationManager;
		let tmpContent = '';

		tmpContent += '{bold}Schema Migrator{/bold}\n';
		tmpContent += '──────────────────────────────────────\n\n';

		if (!tmpMM.DiffResult)
		{
			tmpContent += '  {yellow-fg}No diff results available.{/yellow-fg}\n\n';
			tmpContent += '  Use the CLI to generate a diff:\n';
			tmpContent += '    meadow-migration diff <source-schema> <target-schema>\n';
		}
		else
		{
			let tmpDiff = tmpMM.DiffResult;

			if (tmpDiff.TablesAdded && tmpDiff.TablesAdded.length > 0)
			{
				tmpContent += '  {green-fg}Tables Added:{/green-fg}\n';
				for (let i = 0; i < tmpDiff.TablesAdded.length; i++)
				{
					tmpContent += '    + ' + tmpDiff.TablesAdded[i] + '\n';
				}
				tmpContent += '\n';
			}

			if (tmpDiff.TablesRemoved && tmpDiff.TablesRemoved.length > 0)
			{
				tmpContent += '  {red-fg}Tables Removed:{/red-fg}\n';
				for (let i = 0; i < tmpDiff.TablesRemoved.length; i++)
				{
					tmpContent += '    - ' + tmpDiff.TablesRemoved[i] + '\n';
				}
				tmpContent += '\n';
			}

			if (tmpDiff.TablesModified && tmpDiff.TablesModified.length > 0)
			{
				tmpContent += '  {yellow-fg}Tables Modified:{/yellow-fg}\n';
				for (let i = 0; i < tmpDiff.TablesModified.length; i++)
				{
					let tmpMod = tmpDiff.TablesModified[i];
					tmpContent += '    ~ ' + tmpMod.TableName + '\n';

					if (tmpMod.ColumnsAdded && tmpMod.ColumnsAdded.length > 0)
					{
						for (let j = 0; j < tmpMod.ColumnsAdded.length; j++)
						{
							tmpContent += '        {green-fg}+ ' + tmpMod.ColumnsAdded[j].Column + '{/green-fg}\n';
						}
					}
					if (tmpMod.ColumnsRemoved && tmpMod.ColumnsRemoved.length > 0)
					{
						for (let j = 0; j < tmpMod.ColumnsRemoved.length; j++)
						{
							tmpContent += '        {red-fg}- ' + tmpMod.ColumnsRemoved[j].Column + '{/red-fg}\n';
						}
					}
					if (tmpMod.ColumnsModified && tmpMod.ColumnsModified.length > 0)
					{
						for (let j = 0; j < tmpMod.ColumnsModified.length; j++)
						{
							tmpContent += '        {yellow-fg}~ ' + tmpMod.ColumnsModified[j].Column + '{/yellow-fg}\n';
						}
					}
				}
				tmpContent += '\n';
			}

			if ((!tmpDiff.TablesAdded || tmpDiff.TablesAdded.length === 0) &&
				(!tmpDiff.TablesRemoved || tmpDiff.TablesRemoved.length === 0) &&
				(!tmpDiff.TablesModified || tmpDiff.TablesModified.length === 0))
			{
				tmpContent += '  {green-fg}Schemas are identical. No migration needed.{/green-fg}\n';
			}
		}

		this.pict.ContentAssignment.assignContent('#TUI-Content', tmpContent);
		return super.onAfterRender(pRenderable);
	}
}

module.exports = MigrationManagerViewTUIMigrator;
module.exports.default_configuration = _ViewConfiguration;
