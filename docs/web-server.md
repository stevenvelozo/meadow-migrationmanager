# Web Server

## Overview

The Meadow Migration Manager web interface is a Pict application that renders in the browser. The web views are built on `pict-view` and provide interactive schema management with pict-section-flow diagram visualization. This guide covers how to set up and serve the web UI.

## Prerequisites

- Node.js 14+ installed
- `meadow-migrationmanager` installed with dependencies
- For interactive flow diagrams: `pict-section-flow` (included as a dependency)

## Launching the Web Server

### Using Orator

The web UI is designed to be served through Orator (the Retold API server abstraction). Here is a minimal example:

```javascript
const libOrator = require('orator');
const MeadowMigrationManager = require('meadow-migrationmanager');

// Create the migration manager instance
let tmpManager = new MeadowMigrationManager(
	{
		Product: 'MigrationManagerWeb',
		ProductVersion: '0.0.1'
	});

// Register web views
tmpManager.addView('Layout', {}, require('meadow-migrationmanager/source/views/MigrationManager-View-Layout.js'));
tmpManager.addView('SchemaVisualizer', {}, require('meadow-migrationmanager/source/views/MigrationManager-View-SchemaVisualizer.js'));
tmpManager.addView('SchemaMigrator', {}, require('meadow-migrationmanager/source/views/MigrationManager-View-SchemaMigrator.js'));
// ... register additional views as needed

// Create and start an Orator server
let tmpOrator = tmpManager.instantiateServiceProvider('Orator',
	{
		APIServerPort: 8080
	});

tmpOrator.startService(
	(pError) =>
	{
		if (pError)
		{
			console.error('Failed to start server:', pError);
			return;
		}
		console.log('Migration Manager web UI running on http://localhost:8080');
	});
```

### Using a Static File Server

For development, you can serve the web application with any static file server. The Pict views render client-side.

## Views Architecture

The web UI consists of 10 views that render into a shared layout container.

### Layout

The Layout view renders a sidebar navigation menu and a content container. All other views render their content into `#MigrationManager-Content`.

### View Registry

| View | Identifier | Purpose |
|---|---|---|
| Layout | `MigrationManager-Layout` | Master layout with sidebar navigation and content container |
| SchemaLibrary | `MigrationManager-SchemaLibrary` | Schema CRUD (add, view, remove) |
| ConnectionLibrary | `MigrationManager-ConnectionLibrary` | Connection management |
| DDLEditor | `MigrationManager-DDLEditor` | MicroDDL text editing |
| MeadowConfigViewer | `MigrationManager-MeadowConfigViewer` | Meadow package JSON viewer |
| SchemaVisualizer | `MigrationManager-SchemaVisualizer` | Interactive flow diagram + text visualization |
| SchemaDeployer | `MigrationManager-SchemaDeployer` | Schema deployment controls |
| SchemaMigrator | `MigrationManager-SchemaMigrator` | Diff visualization + migration controls |
| MigrationScriptViewer | `MigrationManager-MigrationScriptViewer` | SQL migration script viewer |
| SchemaIntrospector | `MigrationManager-SchemaIntrospector` | Database schema discovery |

## Providers

Providers handle the data lifecycle for the web application:

- **Schema Provider** -- loads and saves the schema library on application start/stop via `onLoadDataAsync()` and `onSaveDataAsync()`
- **Connection Provider** -- loads and saves the connection library
- **Migration Provider** -- orchestrates the introspect, diff, and generate pipeline, coordinating between services

## Flow Diagram Integration

### Configuration

The Schema Visualizer and Schema Migrator views create pict-section-flow views with these settings:

```javascript
{
	FlowDataAddress: 'AppData.MigrationManager.SchemaFlowData',
	TargetElementAddress: '#SchemaFlow-SVG-Container',
	EnableToolbar: true,
	EnablePanning: true,
	EnableZooming: true,
	EnableNodeDragging: true,
	EnableConnectionCreation: false,
	MinZoom: 0.1,
	MaxZoom: 5.0,
	ZoomStep: 0.1,
	DefaultNodeType: 'TABLE',
	DefaultNodeWidth: 260,
	DefaultNodeHeight: 200,
	NodeTypes: this._buildFlowCardNodeTypes()
}
```

### FlowCard Registration

FlowCard node types are registered by creating card instances and extracting their configuration:

```javascript
_buildFlowCardNodeTypes()
{
	let tmpCardClasses =
	[
		libFlowCardMeadowTable.FlowCardMeadowTable,
		libFlowCardMeadowTable.FlowCardMeadowTableAdded,
		libFlowCardMeadowTable.FlowCardMeadowTableRemoved,
		libFlowCardMeadowTable.FlowCardMeadowTableModified
	];

	let tmpNodeTypes = {};

	for (let i = 0; i < tmpCardClasses.length; i++)
	{
		let tmpCard = new tmpCardClasses[i](this.fable, {}, 'FlowCard-Table-' + i);
		let tmpConfig = tmpCard.getNodeTypeConfiguration();
		tmpNodeTypes[tmpConfig.Hash] = tmpConfig;
	}

	return tmpNodeTypes;
}
```

### Flow Data Generation

The `FlowDataBuilder` service converts compiled schemas to flow data in `onBeforeRender()`:

```javascript
onBeforeRender(pRenderable)
{
	let tmpAppData = this.fable.AppData.MigrationManager;
	let tmpCompiledSchema = /* get active schema's compiled output */;

	if (tmpCompiledSchema)
	{
		let tmpFlowBuilder = this.fable.instantiateServiceProviderIfNotExists('FlowDataBuilder');
		tmpAppData.SchemaFlowData = tmpFlowBuilder.buildFlowData(tmpCompiledSchema);
	}

	return super.onBeforeRender(pRenderable);
}
```

For diff visualization, use `buildDiffFlowData()` which color-codes nodes by change status.

### Node Structure

Each table becomes a flow node with:
- **Title bar** showing the table name
- **Output ports** (right side) for FK columns
- **Input ports** (left side) for referenced PK columns
- **Body data** containing column definitions with type abbreviations

### FlowCard Variants

| Card | Type Code | Title Bar | Body Background | Usage |
|---|---|---|---|---|
| FlowCardMeadowTable | `TABLE` | `#2c3e50` | `#ecf0f1` | Default table |
| FlowCardMeadowTableAdded | `TABLE_ADDED` | `#27ae60` | `#eafaf1` | Added in diff |
| FlowCardMeadowTableRemoved | `TABLE_REMOVED` | `#c0392b` | `#fdedec` | Removed in diff |
| FlowCardMeadowTableModified | `TABLE_MODIFIED` | `#e67e22` | `#fef5e7` | Modified in diff |

## Customizing the Web UI

### Adding Custom Views

Create a new view extending `pict-view` and register it:

```javascript
const libPictView = require('pict-view');

class MyCustomView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this.serviceType = 'PictView';
	}
}

// Set default_configuration with Templates and Renderables
MyCustomView.default_configuration = { /* ... */ };

// Register on the manager
tmpManager.addView('MyCustom', {}, MyCustomView);
```

### Overriding Templates

Each view's templates can be overridden by providing new template strings in the view configuration when registering. Pict template expressions use `{~D:path.to.data~}` for data binding.

### Custom CSS

Views can include scoped CSS via the `CSS` property in their `default_configuration`. The CSS is injected into the page when the view is rendered.
