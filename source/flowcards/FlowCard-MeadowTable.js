/**
 * Meadow Migration Manager - FlowCard for Database Tables
 *
 * Defines the visual appearance of table nodes in a pict-section-flow
 * diagram.  Each table node shows its name in the title bar and lists
 * columns in the body area with type abbreviations.  Ports are generated
 * dynamically by the FlowDataBuilder service (not statically here), so
 * the Inputs and Outputs arrays are empty.
 *
 * Additional FlowCard variants are exported for diff-colored nodes:
 *   - FlowCardMeadowTableAdded   (green)
 *   - FlowCardMeadowTableRemoved (red)
 *   - FlowCardMeadowTableModified (yellow)
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */
const libPictFlowCard = require('pict-section-flow').PictFlowCard;

/**
 * Base table FlowCard — dark blue-gray title bar.
 */
class FlowCardMeadowTable extends libPictFlowCard
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, Object.assign(
			{},
			{
				Title: 'Table',
				Name: 'Database Table',
				Code: 'TABLE',
				Description: 'A database table with columns.',
				Icon: 'TABLE',
				Category: 'Schema',
				TitleBarColor: '#2c3e50',
				BodyStyle: { fill: '#ecf0f1', stroke: '#2c3e50' },
				Width: 260,
				Height: 200,
				Inputs: [],
				Outputs: [],
				ShowTypeLabel: false,
				PortLabelsOnHover: false
			},
			pOptions),
			pServiceHash);
	}
}

/**
 * Added table variant — green title bar.
 */
class FlowCardMeadowTableAdded extends libPictFlowCard
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, Object.assign(
			{},
			{
				Title: 'Table (Added)',
				Name: 'Added Database Table',
				Code: 'TABLE_ADDED',
				Description: 'A database table that was added in the target schema.',
				Icon: 'TABLE',
				Category: 'Schema',
				TitleBarColor: '#27ae60',
				BodyStyle: { fill: '#eafaf1', stroke: '#27ae60' },
				Width: 260,
				Height: 200,
				Inputs: [],
				Outputs: [],
				ShowTypeLabel: false,
				PortLabelsOnHover: false
			},
			pOptions),
			pServiceHash);
	}
}

/**
 * Removed table variant — red title bar.
 */
class FlowCardMeadowTableRemoved extends libPictFlowCard
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, Object.assign(
			{},
			{
				Title: 'Table (Removed)',
				Name: 'Removed Database Table',
				Code: 'TABLE_REMOVED',
				Description: 'A database table that was removed from the source schema.',
				Icon: 'TABLE',
				Category: 'Schema',
				TitleBarColor: '#c0392b',
				BodyStyle: { fill: '#fdedec', stroke: '#c0392b' },
				Width: 260,
				Height: 200,
				Inputs: [],
				Outputs: [],
				ShowTypeLabel: false,
				PortLabelsOnHover: false
			},
			pOptions),
			pServiceHash);
	}
}

/**
 * Modified table variant — yellow/orange title bar.
 */
class FlowCardMeadowTableModified extends libPictFlowCard
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, Object.assign(
			{},
			{
				Title: 'Table (Modified)',
				Name: 'Modified Database Table',
				Code: 'TABLE_MODIFIED',
				Description: 'A database table that was modified between schemas.',
				Icon: 'TABLE',
				Category: 'Schema',
				TitleBarColor: '#e67e22',
				BodyStyle: { fill: '#fef5e7', stroke: '#e67e22' },
				Width: 260,
				Height: 200,
				Inputs: [],
				Outputs: [],
				ShowTypeLabel: false,
				PortLabelsOnHover: false
			},
			pOptions),
			pServiceHash);
	}
}

module.exports = FlowCardMeadowTable;
module.exports.FlowCardMeadowTable = FlowCardMeadowTable;
module.exports.FlowCardMeadowTableAdded = FlowCardMeadowTableAdded;
module.exports.FlowCardMeadowTableRemoved = FlowCardMeadowTableRemoved;
module.exports.FlowCardMeadowTableModified = FlowCardMeadowTableModified;
