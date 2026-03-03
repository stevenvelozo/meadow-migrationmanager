/**
 * Meadow Migration Manager - TUI Application
 *
 * Interactive terminal user interface for managing schemas, connections,
 * and database migrations.  Built on pict-application + pict-terminalui + blessed.
 *
 * Layout:
 *   +-------------------------------------------------------------+
 *   |  Meadow Migration Manager                          [q]uit   |
 *   +----------------+--------------------------------------------+
 *   | Schemas        |                                            |
 *   | Connections    |  (content area - swapped per selection)    |
 *   | DDL Editor     |                                            |
 *   | Meadow JSON    |                                            |
 *   | Visualizer     |                                            |
 *   | Deploy         |                                            |
 *   | Migrate        |                                            |
 *   | Script         |                                            |
 *   | Introspect     |                                            |
 *   +----------------+--------------------------------------------+
 *   | Status: Ready                                               |
 *   +-------------------------------------------------------------+
 *
 * Keyboard:
 *   Up/Down  - navigate sidebar
 *   Enter    - select sidebar item -> show detail
 *   Tab      - toggle sidebar / content focus
 *   q/Ctrl-C - quit
 *
 * @license MIT
 * @author Steven Velozo <steven@velozo.com>
 */

// Suppress blessed's Setulc stderr noise before anything loads
const _origStderrWrite = process.stderr.write;
process.stderr.write = function (pChunk)
{
	if (typeof pChunk === 'string' && pChunk.indexOf('Setulc') !== -1)
	{
		return true;
	}
	return _origStderrWrite.apply(process.stderr, arguments);
};

const blessed = require('blessed');
const libPictApplication = require('pict-application');
const libPictTerminalUI = require('pict-terminalui');

// TUI Views
const libViewLayout = require('./views/MigrationManagerView-TUI-Layout.js');
const libViewHeader = require('./views/MigrationManagerView-TUI-Header.js');
const libViewStatusBar = require('./views/MigrationManagerView-TUI-StatusBar.js');
const libViewSchemaOverview = require('./views/MigrationManagerView-TUI-SchemaOverview.js');
const libViewConnectionOverview = require('./views/MigrationManagerView-TUI-ConnectionOverview.js');
const libViewDDLView = require('./views/MigrationManagerView-TUI-DDLView.js');
const libViewMeadowConfig = require('./views/MigrationManagerView-TUI-MeadowConfig.js');
const libViewVisualizer = require('./views/MigrationManagerView-TUI-Visualizer.js');
const libViewDeployer = require('./views/MigrationManagerView-TUI-Deployer.js');
const libViewMigrator = require('./views/MigrationManagerView-TUI-Migrator.js');
const libViewScript = require('./views/MigrationManagerView-TUI-Script.js');
const libViewIntrospector = require('./views/MigrationManagerView-TUI-Introspector.js');

/**
 * Sidebar navigation item definitions.
 *
 * Each entry maps a display label to a view key suffix (used as
 * `TUI-{ViewKey}` when resolving pict views).
 */
const SIDEBAR_ITEMS =
[
	{ Label: 'Schemas', ViewKey: 'SchemaOverview' },
	{ Label: 'Connections', ViewKey: 'ConnectionOverview' },
	{ Label: 'DDL Editor', ViewKey: 'DDLView' },
	{ Label: 'Meadow JSON', ViewKey: 'MeadowConfig' },
	{ Label: 'Visualizer', ViewKey: 'Visualizer' },
	{ Label: 'Deploy', ViewKey: 'Deployer' },
	{ Label: 'Migrate', ViewKey: 'Migrator' },
	{ Label: 'Script', ViewKey: 'Script' },
	{ Label: 'Introspect', ViewKey: 'Introspector' }
];

/**
 * The Meadow Migration Manager TUI Application.
 *
 * Extends PictApplication and wires up all blessed widgets, pict views,
 * and keyboard navigation for an interactive migration management experience.
 */
class MigrationManagerTUIApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		/** @type {Object|null} */
		this.terminalUI = null;
		/** @type {string} */
		this.currentView = 'SchemaOverview';
		/** @type {Object|null} */
		this._sidebarWidget = null;
		/** @type {Object|null} */
		this._contentWidget = null;
		/** @type {Object|null} */
		this._screen = null;
		/** @type {boolean} */
		this._sidebarFocused = true;

		// Initialize TUI-specific AppData
		if (!this.pict.AppData.TUI)
		{
			this.pict.AppData.TUI =
			{
				CurrentView: 'SchemaOverview',
				StatusMessage: 'Ready',
				SchemaCount: 0,
				ConnectionCount: 0
			};
		}

		// Register all TUI views
		this.pict.addView('TUI-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('TUI-Header', libViewHeader.default_configuration, libViewHeader);
		this.pict.addView('TUI-StatusBar', libViewStatusBar.default_configuration, libViewStatusBar);
		this.pict.addView('TUI-SchemaOverview', libViewSchemaOverview.default_configuration, libViewSchemaOverview);
		this.pict.addView('TUI-ConnectionOverview', libViewConnectionOverview.default_configuration, libViewConnectionOverview);
		this.pict.addView('TUI-DDLView', libViewDDLView.default_configuration, libViewDDLView);
		this.pict.addView('TUI-MeadowConfig', libViewMeadowConfig.default_configuration, libViewMeadowConfig);
		this.pict.addView('TUI-Visualizer', libViewVisualizer.default_configuration, libViewVisualizer);
		this.pict.addView('TUI-Deployer', libViewDeployer.default_configuration, libViewDeployer);
		this.pict.addView('TUI-Migrator', libViewMigrator.default_configuration, libViewMigrator);
		this.pict.addView('TUI-Script', libViewScript.default_configuration, libViewScript);
		this.pict.addView('TUI-Introspector', libViewIntrospector.default_configuration, libViewIntrospector);
	}

	/**
	 * After Pict initialization, create the blessed screen, widgets, and
	 * bind keyboard navigation. Then render the initial view.
	 *
	 * @param {function} fCallback
	 */
	onAfterInitializeAsync(fCallback)
	{
		// Load schema and connection libraries
		this._loadLibraries(
			() =>
			{
				// Create the terminal UI bridge
				this.terminalUI = new libPictTerminalUI(this.pict,
					{
						Title: 'Meadow Migration Manager'
					});

				// Create the blessed screen
				this._screen = this.terminalUI.createScreen();

				// Build all blessed widgets
				this._createBlessedLayout(this._screen);

				// Bind keyboard navigation
				this._bindNavigation(this._screen);

				// Populate sidebar
				this._populateSidebar();

				// Render the initial layout
				this.pict.views['TUI-Layout'].render();
				this._screen.render();

				return super.onAfterInitializeAsync(fCallback);
			});
	}

	/**
	 * Load schema and connection libraries from disk (if they exist).
	 *
	 * @param {function} fCallback
	 */
	_loadLibraries(fCallback)
	{
		let tmpSchemaLibrary = this.pict.instantiateServiceProvider('SchemaLibrary');
		let tmpConnectionLibrary = this.pict.instantiateServiceProvider('ConnectionLibrary');

		let tmpSchemaLibraryFile = this.pict.settings.SchemaLibraryFile || '.meadow-migration-schemas.json';
		let tmpConnectionLibraryFile = this.pict.settings.ConnectionLibraryFile || '.meadow-migration-connections.json';

		tmpSchemaLibrary.loadLibrary(tmpSchemaLibraryFile,
			() =>
			{
				tmpConnectionLibrary.loadLibrary(tmpConnectionLibraryFile,
					() =>
					{
						this._updateCounts();
						return fCallback();
					});
			});
	}

	/**
	 * Update schema and connection counts in TUI AppData.
	 */
	_updateCounts()
	{
		let tmpSchemas = this.pict.AppData.MigrationManager.Schemas;
		let tmpConnections = this.pict.AppData.MigrationManager.Connections;

		this.pict.AppData.TUI.SchemaCount = Object.keys(tmpSchemas).length;
		this.pict.AppData.TUI.ConnectionCount = Object.keys(tmpConnections).length;
	}

	/**
	 * Create the blessed widget hierarchy and register each widget with
	 * the terminal UI bridge so pict views can target them by address.
	 *
	 * @param {Object} pScreen - The blessed screen instance
	 */
	_createBlessedLayout(pScreen)
	{
		// Application container
		let tmpContainer = blessed.box(
			{
				parent: pScreen,
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});
		this.terminalUI.registerWidget('#TUI-Application-Container', tmpContainer);

		// Header bar (3 rows)
		let tmpHeader = blessed.box(
			{
				parent: pScreen,
				top: 0,
				left: 0,
				width: '100%',
				height: 3,
				tags: true,
				style:
				{
					fg: 'white',
					bg: 'blue',
					bold: true
				}
			});
		this.terminalUI.registerWidget('#TUI-Header', tmpHeader);

		// Sidebar — navigation list (interactive blessed list)
		this._sidebarWidget = blessed.list(
			{
				parent: pScreen,
				top: 3,
				left: 0,
				width: '20%',
				bottom: 1,
				tags: true,
				keys: true,
				vi: true,
				mouse: true,
				border:
				{
					type: 'line'
				},
				style:
				{
					border: { fg: 'cyan' },
					selected: { fg: 'white', bg: 'blue', bold: true },
					item: { fg: 'white' }
				},
				label: ' Navigation ',
				scrollbar:
				{
					style: { bg: 'blue' }
				}
			});
		this.terminalUI.registerWidget('#TUI-Sidebar', this._sidebarWidget);

		// Content area
		this._contentWidget = blessed.box(
			{
				parent: pScreen,
				top: 3,
				left: '20%',
				width: '80%',
				bottom: 1,
				tags: true,
				scrollable: true,
				mouse: true,
				keys: true,
				vi: true,
				border:
				{
					type: 'line'
				},
				style:
				{
					border: { fg: 'cyan' }
				},
				label: ' Schemas ',
				padding:
				{
					left: 1,
					right: 1
				},
				scrollbar:
				{
					style: { bg: 'green' }
				}
			});
		this.terminalUI.registerWidget('#TUI-Content', this._contentWidget);

		// Status bar (1 row)
		let tmpStatusBar = blessed.box(
			{
				parent: pScreen,
				bottom: 0,
				left: 0,
				width: '100%',
				height: 1,
				tags: true,
				style:
				{
					fg: 'white',
					bg: 'gray'
				}
			});
		this.terminalUI.registerWidget('#TUI-StatusBar', tmpStatusBar);

		// Wire up list selection events
		this._sidebarWidget.on('select',
			(pItem, pIndex) =>
			{
				this._onSidebarSelected(pIndex);
			});
	}

	/**
	 * Bind keyboard shortcuts for the TUI.
	 *
	 * @param {Object} pScreen - The blessed screen instance
	 */
	_bindNavigation(pScreen)
	{
		let tmpSelf = this;

		// Tab toggles focus between sidebar and content
		pScreen.key(['tab'],
			() =>
			{
				if (tmpSelf._sidebarFocused)
				{
					tmpSelf._contentWidget.focus();
					tmpSelf._sidebarFocused = false;
				}
				else
				{
					tmpSelf._sidebarWidget.focus();
					tmpSelf._sidebarFocused = true;
				}
				tmpSelf._screen.render();
			});

		// Quit
		pScreen.key(['q', 'C-c'],
			() =>
			{
				process.exit(0);
			});

		// Focus the sidebar for keyboard navigation initially
		this._sidebarWidget.focus();
	}

	/**
	 * Populate the sidebar list widget with navigation items.
	 */
	_populateSidebar()
	{
		let tmpLabels = [];

		for (let i = 0; i < SIDEBAR_ITEMS.length; i++)
		{
			tmpLabels.push(SIDEBAR_ITEMS[i].Label);
		}

		if (this._sidebarWidget)
		{
			this._sidebarWidget.setItems(tmpLabels);
			this._sidebarWidget.select(0);
		}
	}

	/**
	 * Handle sidebar selection.
	 *
	 * @param {number} pIndex - Index of the selected sidebar item
	 */
	_onSidebarSelected(pIndex)
	{
		if (pIndex >= 0 && pIndex < SIDEBAR_ITEMS.length)
		{
			let tmpItem = SIDEBAR_ITEMS[pIndex];
			this.navigateTo(tmpItem.ViewKey, tmpItem.Label);
		}
	}

	/**
	 * Navigate to a named view in the content area.
	 *
	 * @param {string} pViewKey - The view key suffix (e.g. 'SchemaOverview')
	 * @param {string} pLabel - The display label for the content area border
	 */
	navigateTo(pViewKey, pLabel)
	{
		this.currentView = pViewKey;
		this.pict.AppData.TUI.CurrentView = pViewKey;
		this.pict.AppData.TUI.StatusMessage = pLabel || pViewKey;

		if (this._contentWidget)
		{
			this._contentWidget.setLabel(` ${pLabel || pViewKey} `);
			this._contentWidget.setScroll(0);
		}

		let tmpViewKey = `TUI-${pViewKey}`;
		if (this.pict.views[tmpViewKey])
		{
			this._updateCounts();
			this.pict.views[tmpViewKey].render();
		}

		this.pict.views['TUI-StatusBar'].render();
		if (this._screen)
		{
			this._screen.render();
		}
	}

	/**
	 * Render layout widgets. Called by the layout view template.
	 *
	 * @returns {string} Empty string (widgets are created in JS, not template)
	 */
	renderLayoutWidgets()
	{
		return '';
	}
}

module.exports = MigrationManagerTUIApplication;
